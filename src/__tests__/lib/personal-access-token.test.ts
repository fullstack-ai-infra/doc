import { beforeEach, describe, expect, test, vi } from 'vitest'
import { PersonalAccessTokenScope as DatabaseScope } from '@prisma/client'

vi.mock('server-only', () => ({}))

const databaseMocks = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
}))

vi.mock('@/db/db', () => ({
  db: {
    personalAccessToken: databaseMocks,
  },
}))

import {
  authenticatePersonalAccessToken,
  createPersonalAccessToken,
  generatePersonalAccessToken,
  hashPersonalAccessToken,
  listPersonalAccessTokens,
  PersonalAccessTokenError,
  revokePersonalAccessToken,
} from '@/lib/personal-access-token'

const now = new Date('2026-07-30T08:00:00.000Z')

function dtoRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'token-1',
    name: 'Development',
    tokenPrefix: 'doc_pat_example1',
    scopes: [DatabaseScope.DOCUMENTS_READ],
    expiresAt: new Date('2026-08-30T08:00:00.000Z'),
    lastUsedAt: null,
    revokedAt: null,
    createdAt: now,
    ...overrides,
  }
}

describe('personal access tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    databaseMocks.count.mockResolvedValue(0)
  })

  test('creates a 32-byte token but only persists its hash and display prefix', async () => {
    databaseMocks.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      dtoRow({
        name: data.name,
        tokenPrefix: data.tokenPrefix,
        scopes: data.scopes,
        expiresAt: data.expiresAt,
      })
    )

    const result = await createPersonalAccessToken('user-1', {
      name: ' Development ',
      scopes: ['documents:read', 'documents:write'],
      expiresInDays: 30,
    })
    const persisted = databaseMocks.create.mock.calls[0][0].data

    expect(result.token).toMatch(/^doc_pat_[A-Za-z0-9_-]{43}$/)
    expect(persisted.tokenHash).toBe(hashPersonalAccessToken(result.token))
    expect(JSON.stringify(persisted)).not.toContain(result.token)
    expect(persisted.tokenPrefix).toBe(result.token.slice(0, 16))
    expect(persisted.name).toBe('Development')
    expect(result.personalAccessToken).not.toHaveProperty('tokenHash')
  })

  test.each([0, 366, 1.5])('rejects an invalid %s-day expiry in the service layer', async (expiresInDays) => {
    await expect(
      createPersonalAccessToken('user-1', {
        name: 'Development',
        scopes: ['documents:read'],
        expiresInDays,
      })
    ).rejects.toMatchObject({
      status: 422,
      code: 'validation_error',
    })
    expect(databaseMocks.create).not.toHaveBeenCalled()
  })

  test('limits the number of active tokens per user', async () => {
    databaseMocks.count.mockResolvedValue(20)

    await expect(
      createPersonalAccessToken('user-1', {
        name: 'One too many',
        scopes: ['documents:read'],
        expiresInDays: 30,
      })
    ).rejects.toMatchObject({
      status: 429,
      code: 'token_limit_reached',
    })
    expect(databaseMocks.create).not.toHaveBeenCalled()
  })

  test('authenticates a valid Bearer token and returns only the principal', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
    const token = generatePersonalAccessToken()
    databaseMocks.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      scopes: [DatabaseScope.DOCUMENTS_READ, DatabaseScope.DOCUMENTS_WRITE],
      expiresAt: new Date('2026-08-30T08:00:00.000Z'),
      lastUsedAt: null,
      revokedAt: null,
    })
    databaseMocks.updateMany.mockResolvedValue({ count: 1 })

    const principal = await authenticatePersonalAccessToken(
      new Request('https://doc.example/api/v1/me', {
        headers: { authorization: `Bearer ${token}` },
      }),
      'documents:read'
    )

    expect(databaseMocks.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tokenHash: hashPersonalAccessToken(token) },
      })
    )
    expect(principal).toEqual({
      userId: 'user-1',
      tokenId: 'token-1',
      scopes: ['documents:read', 'documents:write'],
    })
    expect(databaseMocks.updateMany).toHaveBeenCalledOnce()
  })

  test('supports validity-only authentication without a required scope', async () => {
    const token = generatePersonalAccessToken()
    databaseMocks.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      scopes: [DatabaseScope.DOCUMENTS_WRITE],
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: new Date(),
      revokedAt: null,
    })

    await expect(
      authenticatePersonalAccessToken(
        new Request('https://doc.example/api/v1/me', {
          headers: { authorization: `Bearer ${token}` },
        })
      )
    ).resolves.toMatchObject({ userId: 'user-1', tokenId: 'token-1' })
  })

  test('rejects malformed, expired, and revoked tokens as the same invalid token error', async () => {
    await expect(
      authenticatePersonalAccessToken(
        new Request('https://doc.example/api/v1/me', {
          headers: { authorization: 'Bearer not-a-doc-token' },
        })
      )
    ).rejects.toMatchObject({ status: 401, code: 'invalid_token' })
    expect(databaseMocks.findUnique).not.toHaveBeenCalled()

    const token = generatePersonalAccessToken()
    databaseMocks.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      scopes: [DatabaseScope.DOCUMENTS_READ],
      expiresAt: new Date(Date.now() - 1),
      lastUsedAt: null,
      revokedAt: null,
    })
    await expect(
      authenticatePersonalAccessToken(
        new Request('https://doc.example/api/v1/me', {
          headers: { authorization: `Bearer ${token}` },
        })
      )
    ).rejects.toMatchObject({ status: 401, code: 'invalid_token' })

    databaseMocks.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      scopes: [DatabaseScope.DOCUMENTS_READ],
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: null,
      revokedAt: new Date(),
    })
    await expect(
      authenticatePersonalAccessToken(
        new Request('https://doc.example/api/v1/me', {
          headers: { authorization: `Bearer ${token}` },
        })
      )
    ).rejects.toBeInstanceOf(PersonalAccessTokenError)
  })

  test('returns a distinct insufficient scope error', async () => {
    const token = generatePersonalAccessToken()
    databaseMocks.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      scopes: [DatabaseScope.DOCUMENTS_READ],
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: new Date(),
      revokedAt: null,
    })

    await expect(
      authenticatePersonalAccessToken(
        new Request('https://doc.example/api/v1/documents', {
          headers: { authorization: `Bearer ${token}` },
        }),
        'documents:write'
      )
    ).rejects.toMatchObject({ status: 403, code: 'insufficient_scope' })
  })

  test('lists safe DTOs and scopes revocation to the owner', async () => {
    databaseMocks.findMany.mockResolvedValueOnce([dtoRow()]).mockResolvedValueOnce([])
    const listed = await listPersonalAccessTokens('user-1')
    expect(databaseMocks.findMany).toHaveBeenCalledTimes(2)
    expect(databaseMocks.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          OR: expect.any(Array),
        }),
        take: 100,
      })
    )
    expect(listed[0]).toEqual(
      expect.objectContaining({
        id: 'token-1',
        scopes: ['documents:read'],
      })
    )
    expect(listed[0]).not.toHaveProperty('tokenHash')

    databaseMocks.updateMany.mockResolvedValue({ count: 0 })
    databaseMocks.findFirst.mockResolvedValue(null)
    await expect(revokePersonalAccessToken('user-1', 'someone-elses-token')).resolves.toBe(false)
    expect(databaseMocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'someone-elses-token', userId: 'user-1' }),
      })
    )
  })
})
