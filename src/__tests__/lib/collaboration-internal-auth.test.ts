// @vitest-environment node

import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import type { Server } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createCollabRouter,
  hasValidInternalKey,
  parseAccessRevocation,
} from '../../../services/collaboration/src/http/collab-routes'

const originalInternalKey = process.env.INTERNAL_API_KEY
const servers: Server[] = []

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      )
  )
  if (originalInternalKey == null) delete process.env.INTERNAL_API_KEY
  else process.env.INTERNAL_API_KEY = originalInternalKey
})

async function startAccessRouter(revokeActiveAccess: (docId: string, userId: string) => number) {
  const app = new Koa()
  const router = createCollabRouter({ revokeActiveAccess })
  app.use(bodyParser())
  app.use(router.routes()).use(router.allowedMethods())
  const server = app.listen(0)
  servers.push(server)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (address == null || typeof address === 'string') throw new Error('test server address unavailable')
  return `http://127.0.0.1:${address.port}`
}

describe('collaboration internal request authentication', () => {
  it('fails closed when the service key is not configured', () => {
    delete process.env.INTERNAL_API_KEY
    expect(hasValidInternalKey({ get: () => '' })).toBe(false)
  })

  it('rejects a different header value', () => {
    process.env.INTERNAL_API_KEY = 'expected-key'
    expect(hasValidInternalKey({ get: () => 'wrong-key' })).toBe(false)
  })

  it('accepts the configured internal header value', () => {
    process.env.INTERNAL_API_KEY = 'expected-key'
    expect(hasValidInternalKey({ get: () => 'expected-key' })).toBe(true)
  })

  it('rejects oversized or undeclared access-revocation fields', () => {
    expect(
      parseAccessRevocation({
        get: () => String(4 * 1024 + 1),
        request: { body: { userId: 'reader' } },
      })
    ).toBeNull()
    expect(
      parseAccessRevocation({
        get: () => '64',
        request: { body: { userId: 'reader', access: 'WRITE' } },
      })
    ).toBeNull()
  })

  it('requires the internal key before closing an exact document-user target', async () => {
    process.env.INTERNAL_API_KEY = 'expected-key'
    const revokeActiveAccess = vi.fn(() => 2)
    const baseUrl = await startAccessRouter(revokeActiveAccess)

    const unauthorized = await fetch(`${baseUrl}/collab/documents/doc-1/access/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'reader' }),
    })
    expect(unauthorized.status).toBe(401)
    expect(revokeActiveAccess).not.toHaveBeenCalled()

    const response = await fetch(`${baseUrl}/collab/documents/doc-1/access/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-doc-internal-key': 'expected-key',
      },
      body: JSON.stringify({ userId: 'reader' }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true, data: { closedConnections: 2 } })
    expect(revokeActiveAccess).toHaveBeenCalledWith('doc-1', 'reader')
  })
})
