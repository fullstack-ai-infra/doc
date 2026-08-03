import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUserInfo: vi.fn(),
  assertOwnDoc: vi.fn(),
  getDocVersionRestoreTarget: vi.fn(),
  restoreDocVersion: vi.fn(),
}))

vi.mock('@/lib/session', () => ({ getUserInfo: mocks.getUserInfo }))
vi.mock('@/lib/doc-version/server', () => ({
  assertOwnDoc: mocks.assertOwnDoc,
  getDocVersionRestoreTarget: mocks.getDocVersionRestoreTarget,
  restoreDocVersion: mocks.restoreDocVersion,
}))

import { POST } from '@/app/api/doc-version/restore/route'

function restoreRequest() {
  return new Request('http://doc.test/api/doc-version/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      docId: 'doc-1',
      targetVersionId: 'version-1',
      currentSnapshot: {
        docId: 'doc-1',
        title: 'Current',
        content: '{"current":true}',
        contentBinaryBase64: 'Y3VycmVudA==',
      },
    }),
  })
}

describe('/api/doc-version/restore partial outcomes', () => {
  beforeEach(() => {
    mocks.getUserInfo.mockResolvedValue({ id: 'owner' })
    mocks.assertOwnDoc.mockResolvedValue(true)
    mocks.getDocVersionRestoreTarget.mockResolvedValue({
      id: 'version-1',
      docId: 'doc-1',
      title: 'Restored',
      contentBinary: Buffer.from('target'),
    })
  })

  it('returns recovery identifiers when content succeeded but title update failed', async () => {
    const partial = {
      status: 'partial',
      stage: 'title',
      errorCode: 'TITLE_UPDATE_FAILED',
      retryable: true,
      docId: 'doc-1',
      restoredVersionId: 'version-1',
      recoverySnapshotId: 'recovery-1',
      operationId: 'restore:doc-1:version-1',
      title: 'Restored',
      contentRestored: true,
      titleUpdated: false,
    }
    mocks.restoreDocVersion.mockResolvedValue(partial)

    const response = await POST(restoreRequest())

    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Document content restored, but title update failed',
      data: partial,
    })
  })
})
