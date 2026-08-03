import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { notifyCollaborationAccessRevoked } from '@/lib/collaboration-access'

const originalBaseUrl = process.env.COLLABORATE_EDIT_HTTP_URL
const originalInternalKey = process.env.COLLABORATE_INTERNAL_API_KEY

afterEach(() => {
  if (originalBaseUrl == null) delete process.env.COLLABORATE_EDIT_HTTP_URL
  else process.env.COLLABORATE_EDIT_HTTP_URL = originalBaseUrl
  if (originalInternalKey == null) delete process.env.COLLABORATE_INTERNAL_API_KEY
  else process.env.COLLABORATE_INTERNAL_API_KEY = originalInternalKey
})

describe('notifyCollaborationAccessRevoked', () => {
  it('sends a bounded identity-only request through the internal service boundary', async () => {
    process.env.COLLABORATE_EDIT_HTTP_URL = 'http://collaboration.test/'
    process.env.COLLABORATE_INTERNAL_API_KEY = 'internal-key'
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { closedConnections: 1 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    await expect(notifyCollaborationAccessRevoked('doc/one', 'reader', { fetchImpl })).resolves.toBe(true)
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://collaboration.test/collab/documents/doc%2Fone/access/revoke',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-doc-internal-key': 'internal-key',
        },
        body: JSON.stringify({ userId: 'reader' }),
      })
    )
    expect(JSON.stringify(fetchImpl.mock.calls)).not.toContain('documentContent')
  })

  it('returns false without throwing when the acceleration path is unavailable', async () => {
    process.env.COLLABORATE_EDIT_HTTP_URL = 'http://collaboration.test'
    process.env.COLLABORATE_INTERNAL_API_KEY = 'internal-key'
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network unavailable'))

    await expect(notifyCollaborationAccessRevoked('doc-1', 'reader', { fetchImpl })).resolves.toBe(false)
  })
})
