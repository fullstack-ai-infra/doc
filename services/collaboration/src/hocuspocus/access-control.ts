import type { DocumentAccess } from '../db/share-relation.js'

export const FORBIDDEN = Object.freeze({
  code: 4403,
  reason: 'Forbidden',
})

export type CollaborationAccessEvent =
  | {
      type: 'collaboration.access_rejected'
      docId: string
      userId: string
      reason: 'revoked'
    }
  | {
      type: 'collaboration.access_invalidated'
      docId: string
      userId: string
      closedConnections: number
    }

export type CollaborationAccessEventHandler = (event: CollaborationAccessEvent) => void

const accessEventHandlers = new Set<CollaborationAccessEventHandler>()

/**
 * Register a content-free access lifecycle hook for audit/metrics adapters. There is no default
 * logger, and one observer cannot interrupt authorization or socket closure.
 */
export function subscribeCollaborationAccessEvents(handler: CollaborationAccessEventHandler): () => void {
  accessEventHandlers.add(handler)
  return () => accessEventHandlers.delete(handler)
}

export function emitCollaborationAccessEvent(event: CollaborationAccessEvent): void {
  accessEventHandlers.forEach((handler) => {
    try {
      handler(event)
    } catch {
      // Audit adapters are observational and must not change authorization behavior.
    }
  })
}

export interface ActiveAccessDeps {
  getShareRelationAccess: (docId: string, userId: string) => Promise<DocumentAccess | null>
  emitAccessEvent?: (event: CollaborationAccessEvent) => void
}

export interface ActiveMessageData {
  connection: ActiveConnection
  context: unknown
  documentName: string
}

export interface ActiveConnection {
  readOnly: boolean
}

interface HocuspocusConnection {
  readOnly: Boolean
  context: unknown
  close: (event: typeof FORBIDDEN) => void
}

interface ActiveDocumentCollection {
  documents: Map<string, { getConnections: () => HocuspocusConnection[] }>
}

interface ConnectionAuthorizationState {
  epoch: number
  invalidated: boolean
}

const connectionAuthorizationStates = new WeakMap<ActiveConnection, ConnectionAuthorizationState>()

// Hocuspocus 2.15's Connection declaration uses the boxed `Boolean` type even though its runtime
// value and hook payload contract are primitive booleans. Keep that upstream typing defect at one
// adapter boundary; authorization state uses `boolean` everywhere else.
function adaptHocuspocusConnection(connection: { readOnly: Boolean }): ActiveConnection {
  return connection as unknown as ActiveConnection
}

export function adaptHocuspocusMessage(data: {
  connection: { readOnly: Boolean }
  context: unknown
  documentName: string
}): ActiveMessageData {
  return { ...data, connection: adaptHocuspocusConnection(data.connection) }
}

function getConnectionAuthorizationState(connection: ActiveConnection): ConnectionAuthorizationState {
  const existing = connectionAuthorizationStates.get(connection)
  if (existing) return existing
  const created = { epoch: 0, invalidated: false }
  connectionAuthorizationStates.set(connection, created)
  return created
}

function contextUserId(context: unknown): string {
  if (context == null || typeof context !== 'object') return ''
  const userId = (context as Record<string, unknown>).userId
  return typeof userId === 'string' ? userId : ''
}

export function forbiddenError(): typeof FORBIDDEN {
  return { ...FORBIDDEN }
}

function rejectActiveConnection(
  data: ActiveMessageData,
  userId: string,
  deps: Pick<ActiveAccessDeps, 'emitAccessEvent'>
): never {
  data.connection.readOnly = true
  deps.emitAccessEvent?.({
    type: 'collaboration.access_rejected',
    docId: data.documentName,
    userId,
    reason: 'revoked',
  })
  throw forbiddenError()
}

/**
 * Revalidate persisted access before Hocuspocus handles an already-authenticated message.
 *
 * This is deliberately fail-closed. The database lookup is the authorization boundary even when
 * an advisory access-invalidation request is delayed or unavailable.
 */
export async function enforceActiveConnectionAccess(
  data: ActiveMessageData,
  deps: ActiveAccessDeps
): Promise<DocumentAccess> {
  const userId = contextUserId(data.context)
  if (!userId) {
    data.connection.readOnly = true
    throw forbiddenError()
  }

  const stateBeforeLookup = getConnectionAuthorizationState(data.connection)
  if (stateBeforeLookup.invalidated) rejectActiveConnection(data, userId, deps)
  const authorizationEpoch = stateBeforeLookup.epoch
  const access = await deps.getShareRelationAccess(data.documentName, userId)

  // A revoke can race an in-flight database read. Recheck the connection-local generation after
  // the await so a stale WRITE result cannot authorize the message that was already being handled.
  const stateAfterLookup = getConnectionAuthorizationState(data.connection)
  if (stateAfterLookup.invalidated || stateAfterLookup.epoch !== authorizationEpoch) {
    rejectActiveConnection(data, userId, deps)
  }

  if (access == null) {
    rejectActiveConnection(data, userId, deps)
  }

  if (access === 'READ') {
    // Hocuspocus checks this flag before applying sync or update messages. Never upgrade a
    // connection in place: a newly granted writer must authenticate on a fresh connection.
    data.connection.readOnly = true
  }

  return access
}

/** Close only active connections that exactly match one document and one user. */
export function closeUserConnections(
  instance: ActiveDocumentCollection,
  docId: string,
  userId: string,
  deps: Pick<ActiveAccessDeps, 'emitAccessEvent'> = {}
): number {
  const document = instance.documents.get(docId)
  if (!document) return 0

  const matches = document.getConnections().filter((connection) => contextUserId(connection.context) === userId)
  // Mark every target before invoking close(). An in-flight beforeHandleMessage lookup sees the
  // new epoch after its await and rejects even if that lookup resolves with an old WRITE result.
  matches.forEach((connection) => {
    const activeConnection = adaptHocuspocusConnection(connection)
    const state = getConnectionAuthorizationState(activeConnection)
    state.epoch += 1
    state.invalidated = true
    activeConnection.readOnly = true
  })
  matches.forEach((connection) => connection.close(FORBIDDEN))

  deps.emitAccessEvent?.({
    type: 'collaboration.access_invalidated',
    docId,
    userId,
    closedConnections: matches.length,
  })

  return matches.length
}
