import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getUserInfo, findFirst, update, sendEmail } = vi.hoisted(() => ({
  getUserInfo: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/session', () => ({ getUserInfo }))
vi.mock('@/db/db', () => ({
  db: {
    doc: {
      findFirst,
      update,
    },
  },
}))
vi.mock('@/lib/mailer', () => ({ sendEmail }))

import { GET, PATCH } from '@/app/api/doc/[id]/route'

describe('GET /api/doc/[id]', () => {
  beforeEach(() => {
    getUserInfo.mockReset()
    findFirst.mockReset()
    update.mockReset()
    sendEmail.mockReset()
  })

  it('requires a session', async () => {
    getUserInfo.mockResolvedValue(null)

    const response = await GET(new Request('http://doc.test/api/doc/doc-1'), {
      params: { id: 'doc-1' },
    })

    await expect(response.json()).resolves.toEqual({
      errno: 401,
      msg: 'Unauthorized',
    })
    expect(findFirst).not.toHaveBeenCalled()
  })

  it('does not reveal an inaccessible document', async () => {
    getUserInfo.mockResolvedValue({ id: 'user-a', email: 'a@example.com' })
    findFirst.mockResolvedValueOnce(null)

    const response = await GET(new Request('http://doc.test/api/doc/doc-1'), {
      params: { id: 'doc-1' },
    })

    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Doc not found',
    })
    expect(findFirst).toHaveBeenCalledTimes(1)
  })

  it('returns only the content fields to the owner', async () => {
    getUserInfo.mockResolvedValue({ id: 'owner', email: 'owner@example.com' })
    findFirst.mockResolvedValueOnce({
      userId: 'owner',
      content: '{"type":"doc"}',
      contentBinary: null,
      shareRelations: [],
    })

    const response = await GET(new Request('http://doc.test/api/doc/doc-1'), {
      params: { id: 'doc-1' },
    })

    await expect(response.json()).resolves.toEqual({
      errno: 0,
      data: {
        content: '{"type":"doc"}',
        contentBinary: null,
      },
    })
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'doc-1',
        isDeleted: false,
        OR: [
          { userId: 'owner' },
          {
            shareRelations: {
              some: { userId: 'owner' },
            },
          },
        ],
      },
      select: {
        userId: true,
        content: true,
        contentBinary: true,
        shareRelations: {
          where: { userId: 'owner' },
          select: { access: true, authorId: true },
        },
      },
    })
  })

  it('returns content for an owner-authored READ relation', async () => {
    getUserInfo.mockResolvedValue({ id: 'reader', email: 'reader@example.com' })
    findFirst.mockResolvedValueOnce({
      userId: 'owner',
      content: '{"type":"doc"}',
      contentBinary: null,
      shareRelations: [{ access: 'READ', authorId: 'owner' }],
    })

    const response = await GET(new Request('http://doc.test/api/doc/doc-1'), {
      params: { id: 'doc-1' },
    })

    expect((await response.json()).errno).toBe(0)
  })

  it('ignores a forged legacy relation not authored by the document owner', async () => {
    getUserInfo.mockResolvedValue({ id: 'reader', email: 'reader@example.com' })
    findFirst.mockResolvedValueOnce({
      userId: 'owner',
      content: '{"type":"doc"}',
      contentBinary: null,
      shareRelations: [{ access: 'WRITE', authorId: 'attacker' }],
    })

    const response = await GET(new Request('http://doc.test/api/doc/doc-1'), {
      params: { id: 'doc-1' },
    })

    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Doc not found',
    })
  })

  it('rejects direct content replacement through the legacy metadata route', async () => {
    getUserInfo.mockResolvedValue({ id: 'owner', email: 'owner@example.com' })

    const response = await PATCH(
      new Request('http://doc.test/api/doc/doc-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: '{"type":"doc"}' }),
      }),
      { params: { id: 'doc-1' } }
    )

    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Update payload invalid',
    })
    expect(update).not.toHaveBeenCalled()
  })
})
