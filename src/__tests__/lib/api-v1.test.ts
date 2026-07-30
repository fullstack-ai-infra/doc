// @vitest-environment node

import { describe, expect, test, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { ApiV1Error, apiError, apiRequestId, apiSuccess, readApiJson } from '@/lib/api-v1'

describe('v1 API response contract', () => {
  test('uses a safe caller request id and returns no-store JSON', async () => {
    const request = new Request('https://doc.example.test/api/v1/me', {
      headers: { 'x-request-id': 'agent-request_1' },
    })
    const requestId = apiRequestId(request)
    const response = apiSuccess({ ok: true }, { requestId })

    expect(requestId).toBe('agent-request_1')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('x-request-id')).toBe(requestId)
    await expect(response.json()).resolves.toEqual({
      data: { ok: true },
      requestId,
    })
  })

  test('emits real authentication status and a Bearer challenge', async () => {
    const response = apiError(new ApiV1Error(401, 'invalid_token', 'Authentication required'), 'request-1')

    expect(response.status).toBe(401)
    expect(response.headers.get('www-authenticate')).toContain('Bearer')
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'invalid_token',
        message: 'Authentication required',
      },
      requestId: 'request-1',
    })
  })

  test('does not expose unknown server errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = apiError(new Error('database password and stack'), 'request-2')

    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('database password')
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  test('rejects invalid and oversized JSON bodies', async () => {
    await expect(
      readApiJson(
        new Request('https://doc.example.test/api/v1/documents', {
          method: 'POST',
          body: '{broken',
        })
      )
    ).rejects.toMatchObject({
      status: 400,
      code: 'invalid_json',
    })

    await expect(
      readApiJson(
        new Request('https://doc.example.test/api/v1/documents', {
          method: 'POST',
          body: JSON.stringify({ value: 'x'.repeat(64) }),
        }),
        16
      )
    ).rejects.toMatchObject({
      status: 413,
      code: 'payload_too_large',
    })
  })

  test('stops reading a chunked body as soon as the byte limit is exceeded', async () => {
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"value":"'))
        controller.enqueue(new TextEncoder().encode('x'.repeat(32)))
        controller.enqueue(new TextEncoder().encode('"}'))
      },
      cancel() {
        cancelled = true
      },
    })
    const request = new Request('https://doc.example.test/api/v1/documents', {
      method: 'POST',
      body,
      duplex: 'half',
    } as RequestInit & { duplex: 'half' })

    await expect(readApiJson(request, 16)).rejects.toMatchObject({
      status: 413,
      code: 'payload_too_large',
    })
    expect(cancelled).toBe(true)
  })
})
