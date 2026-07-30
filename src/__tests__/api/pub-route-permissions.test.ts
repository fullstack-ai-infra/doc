import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUserInfo: vi.fn(),
  docFindFirst: vi.fn(),
  pubCreate: vi.fn(),
  pubFindUnique: vi.fn(),
  pubUpdate: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/session', () => ({ getUserInfo: mocks.getUserInfo }))
vi.mock('@/db/db', () => ({
  db: {
    doc: {
      findFirst: mocks.docFindFirst,
    },
    pubDoc: {
      create: mocks.pubCreate,
      findUnique: mocks.pubFindUnique,
      update: mocks.pubUpdate,
    },
  },
}))

import { POST } from '@/app/api/pub/route'
import { PATCH } from '@/app/api/pub/[publishId]/route'

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('publication document ownership', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.getUserInfo.mockResolvedValue({
      id: 'owner',
      email: 'owner@example.com',
    })
  })

  it('does not publish a document received through WRITE sharing', async () => {
    mocks.docFindFirst.mockResolvedValue({
      userId: 'another-owner',
      shareRelations: [{ access: 'WRITE' }],
    })

    const response = await POST(
      jsonRequest('http://doc.test/api/pub', 'POST', {
        publishId: 'published-doc',
        docId: 'doc-1',
        title: 'Shared',
        htmlContent: '<p>Shared</p>',
      })
    )

    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Doc not found',
    })
    expect(mocks.pubCreate).not.toHaveBeenCalled()
  })

  it('publishes an active document owned by the current user', async () => {
    mocks.docFindFirst.mockResolvedValue({
      userId: 'owner',
      shareRelations: [],
    })
    mocks.pubCreate.mockResolvedValue({
      publishId: 'published-doc',
      docId: 'doc-1',
    })

    const response = await POST(
      jsonRequest('http://doc.test/api/pub', 'POST', {
        publishId: 'published-doc',
        docId: 'doc-1',
        title: 'Owned',
        htmlContent: '<p>Owned</p>',
      })
    )

    expect((await response.json()).errno).toBe(0)
    expect(mocks.pubCreate).toHaveBeenCalled()
  })

  it('does not expose publication storage errors to the client', async () => {
    mocks.docFindFirst.mockResolvedValue({
      userId: 'owner',
      shareRelations: [],
    })
    mocks.pubCreate.mockRejectedValue(new Error('database host and password'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await POST(
      jsonRequest('http://doc.test/api/pub', 'POST', {
        publishId: 'published-doc',
        docId: 'doc-1',
        title: 'Owned',
        htmlContent: '<p>Owned</p>',
      })
    )

    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Unable to publish document',
    })
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('rejects oversized publication requests before database access', async () => {
    const request = jsonRequest('http://doc.test/api/pub', 'POST', {
      publishId: 'published-doc',
      docId: 'doc-1',
      title: 'Owned',
      htmlContent: '<p>Owned</p>',
    })
    request.headers.set('content-length', String(5 * 1024 * 1024))

    const response = await POST(request)

    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Publish payload invalid',
    })
    expect(mocks.docFindFirst).not.toHaveBeenCalled()
    expect(mocks.pubCreate).not.toHaveBeenCalled()
  })

  it('sanitizes published HTML before persistence', async () => {
    mocks.docFindFirst.mockResolvedValue({
      userId: 'owner',
      shareRelations: [],
    })
    mocks.pubCreate.mockResolvedValue({
      publishId: 'published-doc',
      docId: 'doc-1',
    })

    await POST(
      jsonRequest('http://doc.test/api/pub', 'POST', {
        publishId: 'published-doc',
        docId: 'doc-1',
        title: 'Owned',
        htmlContent: '<p onclick="alert(1)">Safe</p><script>alert(1)</script><a href="javascript:alert(1)">link</a>',
      })
    )

    expect(mocks.pubCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        htmlContent: '<p>Safe</p><a>link</a>',
      }),
    })
  })

  it('does not switch an owned publication to a non-owned document', async () => {
    mocks.pubFindUnique.mockResolvedValue({
      publishId: 'published-doc',
      userId: 'owner',
      status: 'PUBLISHED',
    })
    mocks.docFindFirst.mockResolvedValue({
      userId: 'another-owner',
      shareRelations: [{ access: 'READ' }],
    })

    const response = await PATCH(
      jsonRequest('http://doc.test/api/pub/published-doc', 'PATCH', {
        docId: 'doc-2',
        title: 'Not owned',
        htmlContent: '<p>Not owned</p>',
      }),
      {
        params: { publishId: 'published-doc' },
      }
    )

    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Doc not found',
    })
    expect(mocks.pubUpdate).not.toHaveBeenCalled()
  })
})
