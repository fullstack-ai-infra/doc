// @vitest-environment node

import { Hocuspocus, type Hocuspocus as HocuspocusServer } from '@hocuspocus/server'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'

import type { DocumentAccess } from '../src/db/share-relation.js'
import {
  adaptHocuspocusMessage,
  closeUserConnections,
  emitCollaborationAccessEvent,
  enforceActiveConnectionAccess,
  forbiddenError,
  subscribeCollaborationAccessEvents,
} from '../src/hocuspocus/access-control.js'

const providers: HocuspocusProvider[] = []
const servers: HocuspocusServer[] = []

function waitFor(check: () => boolean, message: string, timeout = 4_000): Promise<void> {
  const startedAt = Date.now()
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (check()) return resolve()
      if (Date.now() - startedAt >= timeout) return reject(new Error(`Timed out: ${message}`))
      setTimeout(poll, 10)
    }
    poll()
  })
}

function createProvider(
  server: HocuspocusServer,
  name: string,
  token: string,
  document: Y.Doc,
  onAuthenticationFailed: () => void = () => {}
): HocuspocusProvider {
  const provider = new HocuspocusProvider({
    url: server.webSocketURL,
    name,
    document,
    token,
    broadcast: false,
    quiet: true,
    onAuthenticationFailed,
  })
  providers.push(provider)
  return provider
}

async function createTestServer(accessByUser: Map<string, DocumentAccess>): Promise<HocuspocusServer> {
  const getAccess = async (_docId: string, userId: string): Promise<DocumentAccess | null> =>
    accessByUser.get(userId) || null
  return createTestServerWithLookup(getAccess)
}

async function createTestServerWithLookup(
  getAccess: (docId: string, userId: string) => Promise<DocumentAccess | null>
): Promise<HocuspocusServer> {
  const server = new Hocuspocus({
    port: 0,
    quiet: true,
    unloadImmediately: false,
    async onAuthenticate(data) {
      const userId = data.token
      const access = await getAccess(data.documentName, userId)
      if (access == null) throw forbiddenError()
      if (access === 'READ') data.connection.readOnly = true
      return { userId }
    },
    beforeHandleMessage(data) {
      return enforceActiveConnectionAccess(adaptHocuspocusMessage(data), {
        getShareRelationAccess: getAccess,
      })
    },
  })
  await server.listen(0)
  servers.push(server)
  return server
}

afterEach(async () => {
  while (providers.length > 0) providers.pop()?.destroy()
  while (servers.length > 0) await servers.pop()?.destroy()
})

describe('active collaboration authorization', () => {
  it('eagerly closes the exact active writer while another collaborator keeps working', async () => {
    const accessByUser = new Map<string, DocumentAccess>([
      ['writer', 'WRITE'],
      ['collaborator', 'WRITE'],
    ])
    const server = await createTestServer(accessByUser)
    const writerDoc = new Y.Doc()
    const collaboratorDoc = new Y.Doc()
    const writer = createProvider(server, 'doc-1', 'writer', writerDoc)
    const collaborator = createProvider(server, 'doc-1', 'collaborator', collaboratorDoc)

    await waitFor(() => writer.synced && collaborator.synced, 'both collaborators to sync')
    accessByUser.delete('writer')
    expect(closeUserConnections(server, 'doc-1', 'writer')).toBe(1)
    await waitFor(() => server.getConnectionsCount() === 1, 'only the unaffected collaborator to remain')

    collaboratorDoc.getText('content').insert(0, 'still-active')
    await waitFor(
      () => server.documents.get('doc-1')?.getText('content').toString() === 'still-active',
      'the unaffected collaborator update to persist'
    )
  })

  it('fails closed before applying an old connection update when eager notification is unavailable', async () => {
    const accessByUser = new Map<string, DocumentAccess>([
      ['writer', 'WRITE'],
      ['collaborator', 'WRITE'],
    ])
    const server = await createTestServer(accessByUser)
    const writerDoc = new Y.Doc()
    const collaboratorDoc = new Y.Doc()
    const writer = createProvider(server, 'doc-1', 'writer', writerDoc)
    const collaborator = createProvider(server, 'doc-1', 'collaborator', collaboratorDoc)

    await waitFor(() => writer.synced && collaborator.synced, 'both collaborators to sync')
    writerDoc.getText('content').insert(0, 'accepted')
    await waitFor(
      () => collaboratorDoc.getText('content').toString() === 'accepted',
      'the accepted update to reach the collaborator'
    )

    // Simulate a committed DB revocation followed by a failed internal notification call.
    accessByUser.delete('writer')
    writerDoc.getText('content').insert(8, '-blocked')

    await waitFor(() => server.getConnectionsCount() === 1, 'the revoked connection to close')
    const serverDocument = server.documents.get('doc-1')
    expect(serverDocument?.getText('content').toString()).toBe('accepted')
    expect(collaboratorDoc.getText('content').toString()).toBe('accepted')

    collaboratorDoc.getText('content').insert(8, '-safe')
    await waitFor(
      () => serverDocument?.getText('content').toString() === 'accepted-safe',
      'the unaffected collaborator update to persist'
    )
    expect(collaboratorDoc.getText('content').toString()).toBe('accepted-safe')

    let rejectedReconnects = 0
    const offlineDoc = new Y.Doc()
    offlineDoc.getText('content').insert(0, 'offline-blocked')
    createProvider(server, 'doc-1', 'writer', offlineDoc, () => {
      rejectedReconnects += 1
    })
    await waitFor(() => rejectedReconnects > 0, 'the revoked client reconnect to be denied')
    expect(serverDocument?.getText('content').toString()).not.toContain('blocked')
  })

  it('rejects an in-flight stale WRITE result when revocation advances the connection epoch', async () => {
    const accessByUser = new Map<string, DocumentAccess>([
      ['writer', 'WRITE'],
      ['collaborator', 'WRITE'],
    ])
    let delayWriterLookup = false
    let signalLookupStarted: (() => void) | undefined
    let resolveWriterLookup: ((access: DocumentAccess | null) => void) | undefined
    const lookupStarted = new Promise<void>((resolve) => {
      signalLookupStarted = resolve
    })
    const server = await createTestServerWithLookup(async (_docId, userId) => {
      if (delayWriterLookup && userId === 'writer') {
        delayWriterLookup = false
        signalLookupStarted?.()
        return new Promise<DocumentAccess | null>((resolve) => {
          resolveWriterLookup = resolve
        })
      }
      return accessByUser.get(userId) || null
    })
    const writerDoc = new Y.Doc()
    const collaboratorDoc = new Y.Doc()
    const writer = createProvider(server, 'doc-1', 'writer', writerDoc)
    const collaborator = createProvider(server, 'doc-1', 'collaborator', collaboratorDoc)

    await waitFor(() => writer.synced && collaborator.synced, 'both collaborators to sync')
    writerDoc.getText('content').insert(0, 'accepted')
    await waitFor(() => collaboratorDoc.getText('content').toString() === 'accepted', 'the baseline write to sync')

    delayWriterLookup = true
    writerDoc.getText('content').insert(8, '-stale')
    await lookupStarted
    accessByUser.delete('writer')
    expect(closeUserConnections(server, 'doc-1', 'writer')).toBe(1)
    resolveWriterLookup?.('WRITE')

    await waitFor(() => server.getConnectionsCount() === 1, 'the raced writer connection to close')
    const serverDocument = server.documents.get('doc-1')
    expect(serverDocument?.getText('content').toString()).toBe('accepted')
    expect(collaboratorDoc.getText('content').toString()).toBe('accepted')
  })

  it('downgrades an established writer to read-only before its next message', async () => {
    const connection = { readOnly: false }
    const event = vi.fn()

    await expect(
      enforceActiveConnectionAccess(
        { connection, context: { userId: 'reader' }, documentName: 'doc-1' },
        { getShareRelationAccess: async () => 'READ', emitAccessEvent: event }
      )
    ).resolves.toBe('READ')
    expect(connection.readOnly).toBe(true)
    expect(event).not.toHaveBeenCalled()
  })

  it('fails closed when deletion or an ownership change removes persisted access', async () => {
    const connection = { readOnly: false }

    await expect(
      enforceActiveConnectionAccess(
        { connection, context: { userId: 'former-owner' }, documentName: 'doc-1' },
        { getShareRelationAccess: async () => null }
      )
    ).rejects.toEqual({ code: 4403, reason: 'Forbidden' })
    expect(connection.readOnly).toBe(true)
  })

  it('exposes content-free audit hooks without a default logger', () => {
    const observer = vi.fn()
    const unsubscribe = subscribeCollaborationAccessEvents(observer)
    const event = {
      type: 'collaboration.access_rejected' as const,
      docId: 'doc-1',
      userId: 'reader',
      reason: 'revoked' as const,
    }

    emitCollaborationAccessEvent(event)
    unsubscribe()
    emitCollaborationAccessEvent(event)

    expect(observer).toHaveBeenCalledTimes(1)
    expect(observer).toHaveBeenCalledWith(event)
    expect(JSON.stringify(observer.mock.calls)).not.toContain('content')
  })

  it('closes only exact document-user matches and exposes a content-free audit event', () => {
    const targetOne = { context: { userId: 'target' }, readOnly: false, close: vi.fn() }
    const targetTwo = { context: { userId: 'target' }, readOnly: false, close: vi.fn() }
    const collaborator = { context: { userId: 'collaborator' }, readOnly: false, close: vi.fn() }
    const otherDocTarget = { context: { userId: 'target' }, readOnly: false, close: vi.fn() }
    const emitAccessEvent = vi.fn()
    const instance = {
      documents: new Map([
        ['doc-1', { getConnections: () => [targetOne, collaborator, targetTwo] }],
        ['doc-2', { getConnections: () => [otherDocTarget] }],
      ]),
    }

    expect(closeUserConnections(instance, 'doc-1', 'target', { emitAccessEvent })).toBe(2)
    expect(targetOne.close).toHaveBeenCalledWith({ code: 4403, reason: 'Forbidden' })
    expect(targetTwo.close).toHaveBeenCalledWith({ code: 4403, reason: 'Forbidden' })
    expect(targetOne.readOnly).toBe(true)
    expect(targetTwo.readOnly).toBe(true)
    expect(collaborator.close).not.toHaveBeenCalled()
    expect(otherDocTarget.close).not.toHaveBeenCalled()
    expect(emitAccessEvent).toHaveBeenCalledWith({
      type: 'collaboration.access_invalidated',
      docId: 'doc-1',
      userId: 'target',
      closedConnections: 2,
    })
    expect(JSON.stringify(emitAccessEvent.mock.calls)).not.toContain('content')
  })
})
