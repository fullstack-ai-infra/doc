import 'server-only'

import { db } from '@/db/db'
import { ApiV1Error } from '@/lib/api-v1'

// --- Event Types ---

export const AUDIT_ACTIONS = [
  'document.create',
  'document.delete',
  'document.metadata_update',
  'document.content_mutate',
  'permission.grant',
  'permission.change',
  'permission.revoke',
  'version.create',
  'version.restore',
  'publish.publish',
  'publish.unpublish',
  'proposal.create',
  'proposal.approve',
  'proposal.deny',
  'proposal.commit',
  'bundle.export',
  'bundle.import',
  'token.create',
  'token.revoke',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export type AuditOutcome = 'success' | 'failure' | 'denied'

export interface AuditEventInput {
  actor: string
  actorType?: 'user' | 'agent' | 'system'
  action: AuditAction
  target: string
  targetType?: string
  outcome: AuditOutcome
  requestId?: string
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}

export interface AuditEvent {
  id: string
  actor: string
  actorType: string
  action: string
  target: string
  targetType: string | null
  outcome: string
  requestId: string | null
  idempotencyKey: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AuditQueryParams {
  target?: string
  actor?: string
  action?: string
  startTime?: string
  endTime?: string
  cursor?: string
  limit?: number
}

// --- Storage (uses a dedicated table; see migration below) ---
// For now we use a simple in-memory store with DB backing via a new AuditLog model.
// The Prisma schema addition is part of this feature branch.

/**
 * Record an audit event. This is append-only; the application API
 * never exposes update or delete operations on audit records.
 */
export async function recordAuditEvent(input: AuditEventInput): Promise<AuditEvent> {
  // Redact sensitive fields from metadata
  const safeMetadata = input.metadata ? redactSensitiveFields(input.metadata) : null

  const record = await db.auditLog.create({
    data: {
      actor: input.actor,
      actorType: input.actorType || 'user',
      action: input.action,
      target: input.target,
      targetType: input.targetType || null,
      outcome: input.outcome,
      requestId: input.requestId || null,
      idempotencyKey: input.idempotencyKey || null,
      metadata: safeMetadata as any,
    },
  })

  return toAuditEvent(record)
}

/**
 * Query audit events with filters and pagination.
 * Only accessible by document owners/admins.
 */
export async function queryAuditEvents(
  userId: string,
  isAdmin: boolean,
  params: AuditQueryParams
): Promise<{ events: AuditEvent[]; nextCursor: string | null }> {
  // Non-admin users can only see events where they are the actor or target owner
  const limit = Math.min(Math.max(params.limit || 50, 1), 100)

  const where: any = {}

  if (!isAdmin) {
    where.OR = [{ actor: userId }, { target: { startsWith: userId } }]
  }

  if (params.target) where.target = params.target
  if (params.actor) where.actor = params.actor
  if (params.action) where.action = params.action

  if (params.startTime || params.endTime) {
    where.createdAt = {}
    if (params.startTime) where.createdAt.gte = new Date(params.startTime)
    if (params.endTime) where.createdAt.lte = new Date(params.endTime)
  }

  if (params.cursor) {
    const cursorDate = decodeCursor(params.cursor)
    where.createdAt = { ...where.createdAt, lt: cursorDate }
  }

  const records = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  })

  const hasMore = records.length > limit
  const events = records.slice(0, limit).map(toAuditEvent)
  const last = events.at(-1)

  return {
    events,
    nextCursor: hasMore && last ? encodeCursor(last.createdAt) : null,
  }
}

// --- Helpers ---

const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'credential',
  'authorization',
  'cookie',
  'session',
  'content',
  'body',
  'contentBinary',
  'contentBinaryBase64',
])

function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]'
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactSensitiveFields(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }
  return result
}

function encodeCursor(dateStr: string): string {
  return Buffer.from(dateStr, 'utf8').toString('base64url')
}

function decodeCursor(cursor: string): Date {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8')
    const date = new Date(decoded)
    if (isNaN(date.getTime())) throw new Error('invalid')
    return date
  } catch {
    throw new ApiV1Error(400, 'invalid_cursor', 'Audit cursor is invalid')
  }
}

function toAuditEvent(record: any): AuditEvent {
  return {
    id: record.id,
    actor: record.actor,
    actorType: record.actorType,
    action: record.action,
    target: record.target,
    targetType: record.targetType,
    outcome: record.outcome,
    requestId: record.requestId,
    idempotencyKey: record.idempotencyKey,
    metadata: record.metadata as Record<string, unknown> | null,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
  }
}
