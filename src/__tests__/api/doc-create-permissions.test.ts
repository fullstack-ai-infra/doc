import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUserInfo: vi.fn(),
  count: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  getNextSortOrderForParent: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/session', () => ({ getUserInfo: mocks.getUserInfo }))
vi.mock('@/db/db', () => ({
  db: {
    doc: {
      count: mocks.count,
      findFirst: mocks.findFirst,
      create: mocks.create,
    },
  },
}))
vi.mock('@/lib/doc-sort-order', () => ({
  getNextSortOrderForParent: mocks.getNextSortOrderForParent,
}))
vi.mock('@/lib/mailer', () => ({ sendEmail: mocks.sendEmail }))

import { POST } from '@/app/api/doc/route'

function createRequest(body: unknown) {
  return new Request('http://doc.test/api/doc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/doc permissions', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset())
    mocks.getUserInfo.mockResolvedValue({
      id: 'owner',
      email: 'owner@example.com',
    })
  })

  it('rejects creation at the document limit boundary', async () => {
    mocks.count.mockResolvedValue(100)

    const response = await POST(createRequest({ title: 'One too many' }))

    expect((await response.json()).msg).toBe('You only can create up to 100 docs')
    expect(mocks.findFirst).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('does not duplicate another users or a deleted document', async () => {
    mocks.count.mockResolvedValue(0)
    mocks.findFirst.mockResolvedValue(null)

    const response = await POST(createRequest({ originId: 'source-doc' }))

    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Origin doc not found',
    })
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'source-doc',
        userId: 'owner',
        isDeleted: false,
      },
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('does not create a document below another users parent', async () => {
    mocks.count.mockResolvedValue(0)
    mocks.findFirst.mockResolvedValue(null)

    const response = await POST(
      createRequest({
        title: 'Child',
        parentId: 'another-users-parent',
      })
    )

    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Parent doc not found',
    })
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'another-users-parent',
        userId: 'owner',
        isDeleted: false,
      },
      select: { id: true },
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('duplicates an active document owned by the current user', async () => {
    mocks.count.mockResolvedValue(0)
    mocks.findFirst.mockResolvedValue({
      id: 'source-doc',
      userId: 'owner',
      title: 'Source',
      content: '{"type":"doc"}',
      contentBinary: Buffer.from('binary'),
      parentId: null,
      isDeleted: false,
    })
    mocks.getNextSortOrderForParent.mockResolvedValue(1024)
    mocks.create.mockResolvedValue({ id: 'copy-doc', title: 'Source copy' })

    const response = await POST(createRequest({ originId: 'source-doc' }))

    expect((await response.json()).errno).toBe(0)
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        id: undefined,
        title: 'Source copy',
        content: '{"type":"doc"}',
        contentBinary: Buffer.from('binary'),
        parentId: null,
        sortOrder: 1024,
        userId: 'owner',
      },
    })
  })
})
