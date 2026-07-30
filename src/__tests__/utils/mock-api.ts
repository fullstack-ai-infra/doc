import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { TEST_DOC, TEST_DOC_ID, TEST_DOC2, TEST_USER2_NAME } from '../utils/constants'

export default function mockAPI() {
  let personalAccessTokens: Array<Record<string, unknown>> = []
  const restHandlers = [
    // doc APIs
    http.get(`/api/doc/${TEST_DOC_ID}`, () => {
      return HttpResponse.json({ errno: 0, data: TEST_DOC })
    }),
    http.post('/api/doc', () => {
      return HttpResponse.json({ errno: 0, data: TEST_DOC2 })
    }),
    http.patch(`/api/doc/${TEST_DOC_ID}`, () => {
      return HttpResponse.json({ errno: 0 })
    }),
    http.post('/api/doc/move', async ({ request }) => {
      const body = (await request.json()) as { draggedId: string; parentId: string | null }
      return HttpResponse.json({
        errno: 0,
        data: {
          updates: [{ id: body.draggedId, parentId: body.parentId, sortOrder: 1024 }],
        },
      })
    }),
    http.delete(`/api/doc`, () => {
      return HttpResponse.json({ errno: 0 })
    }),
    // user APIs
    http.patch('/api/user', () => {
      return HttpResponse.json({ errno: 0 })
    }),
    http.post('/api/user/sign-out', () => {
      return HttpResponse.json({ errno: 0 })
    }),

    // other APIs
    http.post(`/api/doc/share-relation`, () => {
      return HttpResponse.json({
        errno: 0,
        data: {
          userName: TEST_USER2_NAME,
          shareRelation: {
            id: Math.random().toString(),
            docId: TEST_DOC_ID,
          },
        },
      })
    }),
    // personal access token APIs
    http.get('/api/personal-access-tokens', () => {
      return HttpResponse.json({ data: personalAccessTokens })
    }),
    http.post('/api/personal-access-tokens', async ({ request }) => {
      const body = (await request.json()) as {
        name: string
        scopes: string[]
        expiresInDays: number
      }
      const safeToken = {
        id: 'pat-test-1',
        name: body.name,
        tokenPrefix: 'doc_pat_aaaaaaaa',
        scopes: body.scopes,
        expiresAt: new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date().toISOString(),
      }
      personalAccessTokens = [safeToken, ...personalAccessTokens]
      return HttpResponse.json(
        {
          data: {
            ...safeToken,
            token: `doc_pat_${'a'.repeat(43)}`,
          },
        },
        { status: 201 }
      )
    }),
    http.delete('/api/personal-access-tokens/:id', ({ params }) => {
      personalAccessTokens = personalAccessTokens.map((token) =>
        token.id === params.id ? { ...token, revokedAt: new Date().toISOString() } : token
      )
      return new HttpResponse(null, { status: 204 })
    }),
  ]

  const server = setupServer(...restHandlers)

  // Start server before all tests
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  //  Close server after all tests
  afterAll(() => server.close())

  // Reset handlers after each test `important for test isolation`
  afterEach(() => server.resetHandlers())
}
