import { afterAll, afterEach, beforeAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { TEST_DOC, TEST_DOC_ID, TEST_DOC2, TEST_USER2_NAME } from '../utils/constants'

export default function mockAPI() {
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
  ]

  const server = setupServer(...restHandlers)

  // Start server before all tests
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  //  Close server after all tests
  afterAll(() => server.close())

  // Reset handlers after each test `important for test isolation`
  afterEach(() => server.resetHandlers())
}
