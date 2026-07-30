import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authenticatePersonalAccessToken: vi.fn(),
  listApiDocuments: vi.fn(),
  getApiDocument: vi.fn(),
  createApiDocument: vi.fn(),
  updateApiDocument: vi.fn(),
  parseCreateApiDocument: vi.fn(),
  parseUpdateApiDocument: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/personal-access-token', () => ({
  authenticatePersonalAccessToken: mocks.authenticatePersonalAccessToken,
}))

vi.mock('@/lib/api-v1-documents', () => ({
  listApiDocuments: mocks.listApiDocuments,
  getApiDocument: mocks.getApiDocument,
  createApiDocument: mocks.createApiDocument,
  updateApiDocument: mocks.updateApiDocument,
  parseCreateApiDocument: mocks.parseCreateApiDocument,
  parseUpdateApiDocument: mocks.parseUpdateApiDocument,
}))

import { GET as inspectToken } from '@/app/api/v1/me/route'
import { GET as listDocuments, POST as createDocument } from '@/app/api/v1/documents/route'
import { GET as getDocument, PATCH as updateDocument } from '@/app/api/v1/documents/[id]/route'

const principal = {
  userId: 'user-1',
  tokenId: 'token-1',
  scopes: ['documents:read', 'documents:write'],
}

function apiRequest(path: string, init: RequestInit = {}) {
  return new Request(`https://doc.example${path}`, {
    ...init,
    headers: {
      authorization: `Bearer doc_pat_${'a'.repeat(43)}`,
      'content-type': 'application/json',
      'x-request-id': 'route-test',
      ...init.headers,
    },
  })
}

describe('/api/v1 document routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authenticatePersonalAccessToken.mockResolvedValue(principal)
  })

  it('inspects a valid token without requiring a document scope', async () => {
    const response = await inspectToken(apiRequest('/api/v1/me'))

    expect(mocks.authenticatePersonalAccessToken).toHaveBeenCalledWith(expect.any(Request))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        authenticated: true,
        userId: 'user-1',
        scopes: principal.scopes,
      },
      requestId: 'route-test',
    })
  })

  it('lists owner documents with read scope and cursor metadata', async () => {
    mocks.listApiDocuments.mockResolvedValue({
      documents: [{ id: 'doc-1', title: 'Runbook' }],
      nextCursor: 'next-page',
    })

    const response = await listDocuments(apiRequest('/api/v1/documents?limit=10'))

    expect(mocks.authenticatePersonalAccessToken).toHaveBeenCalledWith(expect.any(Request), 'documents:read')
    expect(mocks.listApiDocuments).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ get: expect.any(Function) })
    )
    await expect(response.json()).resolves.toMatchObject({
      data: [{ id: 'doc-1', title: 'Runbook' }],
      meta: { nextCursor: 'next-page' },
    })
  })

  it('creates a document with write scope and returns its canonical location and ETag', async () => {
    const input = { title: 'Runbook' }
    mocks.parseCreateApiDocument.mockReturnValue(input)
    mocks.createApiDocument.mockResolvedValue({
      document: { id: 'doc-1', title: 'Runbook' },
      etag: '"doc:doc-1:revision"',
    })

    const response = await createDocument(
      apiRequest('/api/v1/documents', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    )

    expect(mocks.authenticatePersonalAccessToken).toHaveBeenCalledWith(expect.any(Request), 'documents:write')
    expect(mocks.createApiDocument).toHaveBeenCalledWith('user-1', input)
    expect(response.status).toBe(201)
    expect(response.headers.get('location')).toBe('/api/v1/documents/doc-1')
    expect(response.headers.get('etag')).toBe('"doc:doc-1:revision"')
  })

  it('gets an authorized document with read scope and exposes its ETag', async () => {
    mocks.getApiDocument.mockResolvedValue({
      document: { id: 'doc-1', title: 'Runbook', content: { type: 'doc' } },
      etag: '"doc:doc-1:revision"',
    })

    const response = await getDocument(apiRequest('/api/v1/documents/doc-1'), {
      params: { id: 'doc-1' },
    })

    expect(mocks.authenticatePersonalAccessToken).toHaveBeenCalledWith(expect.any(Request), 'documents:read')
    expect(mocks.getApiDocument).toHaveBeenCalledWith('user-1', 'doc-1')
    expect(response.headers.get('etag')).toBe('"doc:doc-1:revision"')
  })

  it('forwards the update precondition and preserves a stable API error', async () => {
    const input = { title: 'Production runbook' }
    mocks.parseUpdateApiDocument.mockReturnValue(input)
    const conflict = Object.assign(new Error('Document changed since it was read'), {
      status: 412,
      code: 'document_conflict',
    })
    mocks.updateApiDocument.mockRejectedValue(conflict)

    const response = await updateDocument(
      apiRequest('/api/v1/documents/doc-1', {
        method: 'PATCH',
        headers: { 'if-match': '"stale"' },
        body: JSON.stringify(input),
      }),
      { params: { id: 'doc-1' } }
    )

    expect(mocks.authenticatePersonalAccessToken).toHaveBeenCalledWith(expect.any(Request), 'documents:write')
    expect(mocks.updateApiDocument).toHaveBeenCalledWith('user-1', 'doc-1', input, '"stale"')
    expect(response.status).toBe(412)
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'document_conflict',
        message: 'Document changed since it was read',
      },
      requestId: 'route-test',
    })
  })

  it('returns a Bearer challenge when token authentication fails', async () => {
    mocks.authenticatePersonalAccessToken.mockRejectedValue(
      Object.assign(new Error('A valid Bearer token is required'), {
        status: 401,
        code: 'invalid_token',
      })
    )

    const response = await listDocuments(apiRequest('/api/v1/documents'))

    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toContain('Bearer')
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'invalid_token' },
    })
    expect(mocks.listApiDocuments).not.toHaveBeenCalled()
  })
})
