// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'node:http'

import { startCollaborationService, type CollaborationRuntimeDeps } from '../src/index.js'

const servers: Server[] = []

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
      )
  )
})

describe('compiled collaboration runtime contract', () => {
  it('starts only after the database probe and exposes a database-aware ready endpoint', async () => {
    const events: string[] = []
    const deps: CollaborationRuntimeDeps = {
      connectDatabase: vi.fn(async () => {
        events.push('database')
      }),
      checkDatabase: vi.fn(async () => {}),
      selectMonitorDocument: vi.fn(async () => null),
      handleConnection: vi.fn(),
    }

    const server = await startCollaborationService(0, deps)
    servers.push(server)
    events.push('listening')
    const address = server.address()
    if (address == null || typeof address === 'string') throw new Error('test server address unavailable')

    const response = await fetch(`http://127.0.0.1:${address.port}/ready`)

    expect(events).toEqual(['database', 'listening'])
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      service: 'doc-collaboration',
      status: 'ok',
      checks: { database: 'ok' },
    })
  })

  it('reports degraded readiness without exposing the database failure', async () => {
    const deps: CollaborationRuntimeDeps = {
      connectDatabase: vi.fn(async () => {}),
      checkDatabase: vi.fn(async () => {
        throw new Error('private database URL')
      }),
      selectMonitorDocument: vi.fn(async () => null),
      handleConnection: vi.fn(),
    }
    const server = await startCollaborationService(0, deps)
    servers.push(server)
    const address = server.address()
    if (address == null || typeof address === 'string') throw new Error('test server address unavailable')

    const response = await fetch(`http://127.0.0.1:${address.port}/ready`)

    expect(response.status).toBe(503)
    expect(JSON.stringify(await response.json())).not.toContain('private database URL')
  })
})
