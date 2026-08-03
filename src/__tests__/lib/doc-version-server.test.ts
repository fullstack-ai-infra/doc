import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/db/db', () => ({
  db: {
    $transaction: vi.fn(),
    doc: { update: vi.fn() },
  },
}))

import { restoreDocVersion } from '@/lib/doc-version/server'

const input = {
  docId: 'doc-1',
  userId: 'owner',
  currentSnapshot: {
    docId: 'doc-1',
    title: 'Current title',
    content: '{"current":true}',
    contentBinaryBase64: Buffer.from('current binary').toString('base64'),
  },
  targetVersion: {
    id: 'version-1',
    docId: 'doc-1',
    title: 'Restored title',
    contentBinary: Buffer.from('target binary'),
  },
}

describe('restoreDocVersion recovery ordering', () => {
  const calls: string[] = []
  const createVersion = vi.fn()
  const runTransaction = vi.fn(async (callback) => callback({ docVersion: { create: createVersion } } as never))
  const callCollabRestore = vi.fn(async () => {
    calls.push('restore')
  })
  const updateDocTitle = vi.fn(async () => {
    calls.push('title')
  })

  beforeEach(() => {
    calls.length = 0
    createVersion.mockReset().mockImplementation(async () => {
      calls.push('snapshot')
      return { id: 'recovery-1' }
    })
    runTransaction.mockClear()
    callCollabRestore.mockClear()
    updateDocTitle.mockClear()
  })

  it('persists the current snapshot before restoring the active room', async () => {
    const result = await restoreDocVersion(input, {
      runTransaction: runTransaction as never,
      callCollabRestore,
      updateDocTitle: updateDocTitle as never,
    })

    expect(calls).toEqual(['snapshot', 'restore', 'title'])
    expect(createVersion).toHaveBeenCalledWith({
      data: {
        docId: 'doc-1',
        userId: 'owner',
        title: 'Current title',
        content: '{"current":true}',
        contentBinary: Buffer.from('current binary'),
      },
      select: { id: true },
    })
    expect(callCollabRestore).toHaveBeenCalledWith('doc-1', Buffer.from('target binary').toString('base64'))
    expect(result).toEqual({
      status: 'completed',
      docId: 'doc-1',
      restoredVersionId: 'version-1',
      recoverySnapshotId: 'recovery-1',
      operationId: 'restore:doc-1:version-1',
      title: 'Restored title',
      contentRestored: true,
      titleUpdated: true,
    })
  })

  it('keeps the recovery snapshot and does not change the title when active-room restore fails', async () => {
    callCollabRestore.mockImplementationOnce(async () => {
      calls.push('restore')
      throw new Error('collaboration unavailable')
    })

    await expect(
      restoreDocVersion(input, {
        runTransaction: runTransaction as never,
        callCollabRestore,
        updateDocTitle: updateDocTitle as never,
      })
    ).rejects.toThrow('collaboration unavailable')

    expect(calls).toEqual(['snapshot', 'restore'])
    expect(createVersion).toHaveBeenCalledTimes(1)
    expect(updateDocTitle).not.toHaveBeenCalled()
  })

  it('returns an observable retryable partial result when content succeeds but title update fails', async () => {
    updateDocTitle.mockImplementationOnce(async () => {
      calls.push('title')
      throw new Error('title database unavailable')
    })

    const result = await restoreDocVersion(input, {
      runTransaction: runTransaction as never,
      callCollabRestore,
      updateDocTitle: updateDocTitle as never,
    })

    expect(calls).toEqual(['snapshot', 'restore', 'title'])
    expect(result).toEqual({
      status: 'partial',
      stage: 'title',
      errorCode: 'TITLE_UPDATE_FAILED',
      retryable: true,
      docId: 'doc-1',
      restoredVersionId: 'version-1',
      recoverySnapshotId: 'recovery-1',
      operationId: 'restore:doc-1:version-1',
      title: 'Restored title',
      contentRestored: true,
      titleUpdated: false,
    })
  })

  it('keeps the operation id stable when a partial title outcome is safely retried', async () => {
    createVersion
      .mockImplementationOnce(async () => {
        calls.push('snapshot')
        return { id: 'recovery-1' }
      })
      .mockImplementationOnce(async () => {
        calls.push('snapshot')
        return { id: 'recovery-2' }
      })
    updateDocTitle
      .mockImplementationOnce(async () => {
        calls.push('title')
        throw new Error('transient title failure')
      })
      .mockImplementationOnce(async () => {
        calls.push('title')
      })

    const first = await restoreDocVersion(input, {
      runTransaction: runTransaction as never,
      callCollabRestore,
      updateDocTitle: updateDocTitle as never,
    })
    const retry = await restoreDocVersion(input, {
      runTransaction: runTransaction as never,
      callCollabRestore,
      updateDocTitle: updateDocTitle as never,
    })

    expect(first.status).toBe('partial')
    expect(retry.status).toBe('completed')
    expect(first.operationId).toBe('restore:doc-1:version-1')
    expect(retry.operationId).toBe(first.operationId)
    expect(first.recoverySnapshotId).toBe('recovery-1')
    expect(retry.recoverySnapshotId).toBe('recovery-2')
    expect(callCollabRestore).toHaveBeenCalledTimes(2)
    expect(updateDocTitle).toHaveBeenNthCalledWith(1, 'doc-1', 'Restored title')
    expect(updateDocTitle).toHaveBeenNthCalledWith(2, 'doc-1', 'Restored title')
  })
})
