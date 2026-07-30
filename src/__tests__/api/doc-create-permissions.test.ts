import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TiptapTransformer } from '@hocuspocus/transformer'
import * as Y from 'yjs'

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

function decodeStoredDocument(contentBinary: Buffer) {
  const ydoc = new Y.Doc()
  Y.applyUpdate(ydoc, contentBinary)
  return TiptapTransformer.fromYdoc(ydoc, 'default')
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

  it('creates Web documents with canonical TipTap JSON and matching Yjs state', async () => {
    mocks.count.mockResolvedValue(0)
    mocks.getNextSortOrderForParent.mockResolvedValue(1024)
    mocks.create.mockResolvedValue({ id: 'new-doc', title: '' })

    const response = await POST(createRequest({ id: 'new-doc', parentId: null }))

    expect((await response.json()).errno).toBe(0)
    const createCall = mocks.create.mock.calls[0][0]
    const storedContent = JSON.parse(createCall.data.content)
    expect(storedContent).toMatchObject({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    })
    expect(createCall.data.contentBinary).toBeInstanceOf(Buffer)
    expect(createCall.data.contentBinary.byteLength).toBeGreaterThan(0)
    expect(decodeStoredDocument(createCall.data.contentBinary)).toEqual(storedContent)
  })

  it('accepts legacy JSON-string content and canonicalizes it into matching Yjs state', async () => {
    mocks.count.mockResolvedValue(0)
    mocks.getNextSortOrderForParent.mockResolvedValue(1024)
    mocks.create.mockResolvedValue({ id: 'new-doc', title: 'Imported' })
    const content = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Imported text' }],
        },
      ],
    })

    const response = await POST(createRequest({ title: 'Imported', content }))

    expect((await response.json()).errno).toBe(0)
    const createCall = mocks.create.mock.calls[0][0]
    const storedContent = JSON.parse(createCall.data.content)
    expect(storedContent).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Imported text' }],
        },
      ],
    })
    expect(decodeStoredDocument(createCall.data.contentBinary)).toEqual(storedContent)
  })

  it('rejects request bodies larger than the legacy create limit before querying documents', async () => {
    const response = await POST(createRequest({ title: 'x'.repeat(1024 * 1024) }))

    expect(response.status).toBe(413)
    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Create payload too large',
    })
    expect(mocks.count).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects unknown create fields without querying documents', async () => {
    const response = await POST(createRequest({ title: 'Strict', unexpected: true }))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      errno: -1,
      msg: 'Create payload invalid',
    })
    expect(mocks.count).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects unsupported or unsafe TipTap content without creating a document', async () => {
    mocks.count.mockResolvedValue(0)

    const unsupportedResponse = await POST(
      createRequest({
        title: 'Unsupported',
        content: {
          type: 'doc',
          content: [{ type: 'script', content: [{ type: 'text', text: 'bad' }] }],
        },
      })
    )
    expect(unsupportedResponse.status).toBe(422)
    await expect(unsupportedResponse.json()).resolves.toEqual({
      errno: -1,
      msg: 'Document content unsupported',
    })

    const unsafeResponse = await POST(
      createRequest({
        title: 'Unsafe',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'click',
                  marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
                },
              ],
            },
          ],
        },
      })
    )
    expect(unsafeResponse.status).toBe(422)
    await expect(unsafeResponse.json()).resolves.toEqual({
      errno: -1,
      msg: 'Document content invalid',
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
