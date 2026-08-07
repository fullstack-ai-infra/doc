import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/db/db', () => ({
  db: {
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { db } from '@/db/db'
import { recordAuditEvent, queryAuditEvents } from '@/lib/audit-trail'

const mockDb = vi.mocked(db)

describe('audit-trail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('recordAuditEvent', () => {
    it('records a success event with safe metadata', async () => {
      const now = new Date('2026-08-01T00:00:00Z')
      ;(mockDb.auditLog.create as any).mockResolvedValue({
        id: 'audit-1',
        actor: 'user-1',
        actorType: 'user',
        action: 'document.create',
        target: 'doc-123',
        targetType: 'document',
        outcome: 'success',
        requestId: 'req-1',
        idempotencyKey: null,
        metadata: { title: 'My Doc' },
        createdAt: now,
      })

      const result = await recordAuditEvent({
        actor: 'user-1',
        action: 'document.create',
        target: 'doc-123',
        targetType: 'document',
        outcome: 'success',
        requestId: 'req-1',
        metadata: { title: 'My Doc' },
      })

      expect(result.id).toBe('audit-1')
      expect(result.action).toBe('document.create')
      expect(result.outcome).toBe('success')
      expect(result.createdAt).toBe('2026-08-01T00:00:00.000Z')
    })

    it('redacts sensitive fields from metadata', async () => {
      ;(mockDb.auditLog.create as any).mockImplementation(({ data }: any) => ({
        id: 'audit-2',
        ...data,
        createdAt: new Date(),
      }))

      await recordAuditEvent({
        actor: 'user-1',
        action: 'token.create',
        target: 'token-1',
        outcome: 'success',
        metadata: {
          name: 'My Token',
          token: 'secret-value',
          password: 'should-be-redacted',
          nested: { credential: 'also-secret' },
        },
      })

      const createCall = (mockDb.auditLog.create as any).mock.calls[0][0]
      expect(createCall.data.metadata.name).toBe('My Token')
      expect(createCall.data.metadata.token).toBe('[REDACTED]')
      expect(createCall.data.metadata.password).toBe('[REDACTED]')
      expect(createCall.data.metadata.nested.credential).toBe('[REDACTED]')
    })

    it('records failure events', async () => {
      ;(mockDb.auditLog.create as any).mockImplementation(({ data }: any) => ({
        id: 'audit-3',
        ...data,
        createdAt: new Date(),
      }))

      const result = await recordAuditEvent({
        actor: 'user-2',
        action: 'permission.grant',
        target: 'doc-456',
        outcome: 'denied',
        requestId: 'req-2',
      })

      expect(result.outcome).toBe('denied')
      expect(result.actor).toBe('user-2')
    })

    it('records with idempotency correlation', async () => {
      ;(mockDb.auditLog.create as any).mockImplementation(({ data }: any) => ({
        id: 'audit-4',
        ...data,
        createdAt: new Date(),
      }))

      const result = await recordAuditEvent({
        actor: 'user-1',
        action: 'version.restore',
        target: 'doc-789',
        outcome: 'success',
        idempotencyKey: 'restore-op-1',
        requestId: 'req-3',
      })

      expect(result.idempotencyKey).toBe('restore-op-1')
      expect(result.requestId).toBe('req-3')
    })
  })

  describe('queryAuditEvents', () => {
    it('admin can query all events with filters', async () => {
      ;(mockDb.auditLog.findMany as any).mockResolvedValue([
        {
          id: 'e1',
          actor: 'user-2',
          actorType: 'user',
          action: 'document.create',
          target: 'doc-1',
          targetType: 'document',
          outcome: 'success',
          requestId: null,
          idempotencyKey: null,
          metadata: null,
          createdAt: new Date('2026-08-01'),
        },
      ])

      const result = await queryAuditEvents('admin-1', true, {
        action: 'document.create',
        limit: 10,
      })

      expect(result.events).toHaveLength(1)
      expect(result.events[0].action).toBe('document.create')
      expect(result.nextCursor).toBeNull()
    })

    it('non-admin users are restricted to own events', async () => {
      ;(mockDb.auditLog.findMany as any).mockResolvedValue([])

      await queryAuditEvents('user-1', false, { target: 'doc-1' })

      const findCall = (mockDb.auditLog.findMany as any).mock.calls[0][0]
      expect(findCall.where.OR).toBeDefined()
      expect(findCall.where.OR).toEqual([
        { actor: 'user-1' },
        { target: { startsWith: 'user-1' } },
      ])
    })

    it('returns pagination cursor when more results exist', async () => {
      const events = Array.from({ length: 3 }, (_, i) => ({
        id: `e${i}`,
        actor: 'user-1',
        actorType: 'user',
        action: 'document.create',
        target: `doc-${i}`,
        targetType: null,
        outcome: 'success',
        requestId: null,
        idempotencyKey: null,
        metadata: null,
        createdAt: new Date(`2026-08-0${i + 1}`),
      }))
      ;(mockDb.auditLog.findMany as any).mockResolvedValue(events)

      const result = await queryAuditEvents('user-1', true, { limit: 2 })

      expect(result.events).toHaveLength(2)
      expect(result.nextCursor).not.toBeNull()
    })

    it('supports time range filters', async () => {
      ;(mockDb.auditLog.findMany as any).mockResolvedValue([])

      await queryAuditEvents('admin-1', true, {
        startTime: '2026-07-01T00:00:00Z',
        endTime: '2026-08-01T00:00:00Z',
      })

      const findCall = (mockDb.auditLog.findMany as any).mock.calls[0][0]
      expect(findCall.where.createdAt.gte).toEqual(new Date('2026-07-01T00:00:00Z'))
      expect(findCall.where.createdAt.lte).toEqual(new Date('2026-08-01T00:00:00Z'))
    })
  })
})
