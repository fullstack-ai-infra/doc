import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUserInfo: vi.fn(),
  createPersonalAccessToken: vi.fn(),
  listPersonalAccessTokens: vi.fn(),
  revokePersonalAccessToken: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/session', () => ({
  getUserInfo: mocks.getUserInfo,
}))

vi.mock('@/lib/personal-access-token', () => {
  class PersonalAccessTokenError extends Error {
    status: number
    code: string

    constructor(status: number, code: string, message: string) {
      super(message)
      this.status = status
      this.code = code
    }
  }
  return {
    PERSONAL_ACCESS_TOKEN_SCOPES: ['documents:read', 'documents:write'],
    PersonalAccessTokenError,
    createPersonalAccessToken: mocks.createPersonalAccessToken,
    listPersonalAccessTokens: mocks.listPersonalAccessTokens,
    revokePersonalAccessToken: mocks.revokePersonalAccessToken,
  }
})

import { GET, POST } from '@/app/api/personal-access-tokens/route'
import { DELETE } from '@/app/api/personal-access-tokens/[id]/route'

const dto = {
  id: 'token-1',
  name: 'Development',
  tokenPrefix: 'doc_pat_example1',
  scopes: ['documents:read'],
  expiresAt: '2026-08-30T08:00:00.000Z',
  lastUsedAt: null,
  revokedAt: null,
  createdAt: '2026-07-30T08:00:00.000Z',
}

function mutationRequest(path: string, init: RequestInit = {}) {
  return new Request(`https://doc.example${path}`, {
    ...init,
    headers: {
      origin: 'https://doc.example',
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

describe('personal access token management API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUserInfo.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })
  })

  test('returns 401 for a session-less list request', async () => {
    mocks.getUserInfo.mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'unauthorized' },
    })
  })

  test('lists only the safe token DTO returned by the service', async () => {
    mocks.listPersonalAccessTokens.mockResolvedValue([dto])
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ data: [dto] })
  })

  test('requires a same-origin mutation', async () => {
    const response = await POST(
      mutationRequest('/api/personal-access-tokens', {
        method: 'POST',
        headers: { origin: 'https://attacker.example' },
        body: JSON.stringify({
          name: 'Development',
          scopes: ['documents:read'],
          expiresInDays: 30,
        }),
      })
    )
    expect(response.status).toBe(403)
    expect(mocks.createPersonalAccessToken).not.toHaveBeenCalled()
  })

  test('does not trust client-controlled forwarding headers for the mutation origin', async () => {
    const response = await POST(
      mutationRequest('/api/personal-access-tokens', {
        method: 'POST',
        headers: {
          origin: 'https://attacker.example',
          'x-forwarded-host': 'attacker.example',
          'x-forwarded-proto': 'https',
        },
        body: JSON.stringify({
          name: 'Development',
          scopes: ['documents:read'],
          expiresInDays: 30,
        }),
      })
    )
    expect(response.status).toBe(403)
    expect(mocks.createPersonalAccessToken).not.toHaveBeenCalled()
  })

  test('returns 422 for an invalid or unscoped token request', async () => {
    const response = await POST(
      mutationRequest('/api/personal-access-tokens', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Development',
          scopes: [],
          expiresInDays: 366,
          unexpected: true,
        }),
      })
    )
    expect(response.status).toBe(422)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'validation_error' },
    })
  })

  test('rejects an oversized token-management request before parsing it', async () => {
    const response = await POST(
      mutationRequest('/api/personal-access-tokens', {
        method: 'POST',
        headers: { 'content-length': String(16 * 1024 + 1) },
        body: '{}',
      })
    )

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'payload_too_large' },
    })
    expect(mocks.createPersonalAccessToken).not.toHaveBeenCalled()
  })

  test('returns a newly created raw token exactly in the creation response', async () => {
    mocks.createPersonalAccessToken.mockResolvedValue({
      token: `doc_pat_${'a'.repeat(43)}`,
      personalAccessToken: dto,
    })
    const response = await POST(
      mutationRequest('/api/personal-access-tokens', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Development',
          scopes: ['documents:read'],
          expiresInDays: 30,
        }),
      })
    )
    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      data: {
        ...dto,
        token: `doc_pat_${'a'.repeat(43)}`,
      },
    })
  })

  test('soft-revokes only an owned token and returns no response body', async () => {
    mocks.revokePersonalAccessToken.mockResolvedValue(true)
    const response = await DELETE(mutationRequest('/api/personal-access-tokens/token-1', { method: 'DELETE' }), {
      params: { id: 'token-1' },
    })
    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    expect(mocks.revokePersonalAccessToken).toHaveBeenCalledWith('user-1', 'token-1')

    mocks.revokePersonalAccessToken.mockResolvedValue(false)
    const missing = await DELETE(mutationRequest('/api/personal-access-tokens/token-2', { method: 'DELETE' }), {
      params: { id: 'token-2' },
    })
    expect(missing.status).toBe(404)
  })
})
