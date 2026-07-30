// @vitest-environment node

import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  updateMany: vi.fn(),
  nextSortOrder: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/db/db', () => ({
  db: {
    doc: {
      count: mocks.count,
      create: mocks.create,
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
      updateMany: mocks.updateMany,
    },
  },
}))
vi.mock('@/lib/doc-sort-order', () => ({
  getNextSortOrderForParent: mocks.nextSortOrder,
}))

import { ApiV1Error } from '@/lib/api-v1'
import {
  apiDocumentEtag,
  createApiDocument,
  getApiDocument,
  listApiDocuments,
  parseCreateApiDocument,
  parseUpdateApiDocument,
  updateApiDocument,
} from '@/lib/api-v1-documents'
import { encodeTiptapDocument } from '@/lib/tiptap-codec'

const now = new Date('2026-07-30T10:00:00.000Z')
const later = new Date('2026-07-30T10:05:00.000Z')
const metadata = {
  id: 'doc-1',
  title: 'Example',
  icon: null,
  parentId: null,
  isStar: false,
  isDeleted: false,
  createdAt: now,
  updatedAt: now,
}
const emptyContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.nextSortOrder.mockResolvedValue(1024)
})

describe('TipTap API codec', () => {
  test('creates canonical JSON and Yjs state for supported content', () => {
    const encoded = encodeTiptapDocument(emptyContent)

    expect(encoded.content).toMatchObject({ type: 'doc' })
    expect(encoded.contentJson).toContain('"Hello"')
    expect(encoded.contentBinary.byteLength).toBeGreaterThan(0)
  })

  test('rejects unsafe links and unsupported editor-only nodes', () => {
    expect(() =>
      encodeTiptapDocument({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'unsafe',
                marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
              },
            ],
          },
        ],
      })
    ).toThrowError(expect.objectContaining({ code: 'invalid_content' }))

    expect(() =>
      encodeTiptapDocument({
        type: 'doc',
        content: [{ type: 'mermaidBlock', attrs: { code: 'graph TD' } }],
      })
    ).toThrowError(expect.objectContaining({ code: 'unsupported_content' }))
  })

  test('rejects CSS-bearing TipTap attributes before they reach the editor DOM', () => {
    expect(() =>
      encodeTiptapDocument({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { textAlign: 'left; background-image:url(https://attacker.example)' },
          },
        ],
      })
    ).toThrowError(expect.objectContaining({ code: 'invalid_content' }))

    expect(() =>
      encodeTiptapDocument({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'unsafe',
                marks: [
                  {
                    type: 'highlight',
                    attrs: { color: 'red; background-image:url(https://attacker.example)' },
                  },
                ],
              },
            ],
          },
        ],
      })
    ).toThrowError(expect.objectContaining({ code: 'invalid_content' }))

    expect(() =>
      encodeTiptapDocument({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'unsafe',
                marks: [
                  {
                    type: 'link',
                    attrs: { href: 'https://example.com', target: 'named-frame' },
                  },
                ],
              },
            ],
          },
        ],
      })
    ).toThrowError(expect.objectContaining({ code: 'invalid_content' }))
  })
})

describe('v1 document service', () => {
  test('lists only the principal documents with stable pagination', async () => {
    mocks.findMany.mockResolvedValue([
      metadata,
      { ...metadata, id: 'doc-0', updatedAt: new Date('2026-07-30T09:00:00.000Z') },
    ])

    const result = await listApiDocuments(
      'user-1',
      new URLSearchParams({ limit: '1', query: 'Example', starred: 'false' })
    )

    expect(result.documents).toHaveLength(1)
    expect(result.documents[0]).toMatchObject({
      id: 'doc-1',
      starred: false,
      deleted: false,
      access: 'owner',
    })
    expect(result.nextCursor).toEqual(expect.any(String))
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          isDeleted: false,
          isStar: false,
          title: { contains: 'Example', mode: 'insensitive' },
        }),
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 2,
      })
    )
  })

  test('hides inaccessible documents and permits explicit read shares', async () => {
    mocks.findFirst.mockResolvedValueOnce({
      ...metadata,
      userId: 'user-2',
      content: JSON.stringify(emptyContent),
      shareRelations: [],
    })
    await expect(getApiDocument('user-1', 'doc-1')).rejects.toMatchObject({
      status: 404,
      code: 'document_not_found',
    })

    mocks.findFirst.mockResolvedValueOnce({
      ...metadata,
      userId: 'user-2',
      content: JSON.stringify(emptyContent),
      shareRelations: [{ access: 'READ', authorId: 'user-2' }],
    })
    const result = await getApiDocument('user-1', 'doc-1')
    expect(result.document).toMatchObject({
      id: 'doc-1',
      access: 'read',
      content: emptyContent,
    })
    expect(result.document).not.toHaveProperty('userId')
    expect(result.document).not.toHaveProperty('contentBinary')
  })

  test('ignores forged legacy share relations whose author is not the document owner', async () => {
    mocks.findFirst.mockResolvedValueOnce({
      ...metadata,
      userId: 'owner',
      content: JSON.stringify(emptyContent),
      shareRelations: [{ access: 'WRITE', authorId: 'attacker' }],
    })

    await expect(getApiDocument('reader', 'doc-1')).rejects.toMatchObject({
      status: 404,
      code: 'document_not_found',
    })
  })

  test('enforces the active document limit and parent ownership', async () => {
    mocks.count.mockResolvedValue(100)
    await expect(createApiDocument('user-1', parseCreateApiDocument({ title: 'Limit' }))).rejects.toMatchObject({
      status: 429,
      code: 'document_limit_reached',
    })
    expect(mocks.create).not.toHaveBeenCalled()

    mocks.count.mockResolvedValue(1)
    mocks.findFirst.mockResolvedValue(null)
    await expect(
      createApiDocument('user-1', parseCreateApiDocument({ title: 'Child', parentId: 'another-users-parent' }))
    ).rejects.toMatchObject({
      status: 404,
      code: 'parent_not_found',
    })
  })

  test('creates a document with matching canonical JSON and binary state', async () => {
    mocks.count.mockResolvedValue(0)
    mocks.create.mockImplementation(async ({ data }) => ({
      ...metadata,
      title: data.title,
      content: data.content,
      contentBinary: data.contentBinary,
    }))

    const result = await createApiDocument(
      'user-1',
      parseCreateApiDocument({ title: 'Created', content: emptyContent })
    )

    const createCall = mocks.create.mock.calls[0][0]
    expect(createCall.data.userId).toBe('user-1')
    expect(createCall.data.contentBinary).toBeInstanceOf(Buffer)
    expect(JSON.parse(createCall.data.content)).toMatchObject({ type: 'doc' })
    expect(result.document).toMatchObject({ title: 'Created', access: 'owner' })
  })

  test('requires and atomically checks If-Match for metadata updates', async () => {
    const input = parseUpdateApiDocument({ title: 'Updated' })
    await expect(updateApiDocument('user-1', 'doc-1', input, null)).rejects.toMatchObject({
      status: 428,
      code: 'precondition_required',
    })

    mocks.findFirst.mockResolvedValueOnce(metadata)
    await expect(updateApiDocument('user-1', 'doc-1', input, '"stale"')).rejects.toMatchObject({
      status: 412,
      code: 'document_conflict',
    })
    expect(mocks.updateMany).not.toHaveBeenCalled()

    mocks.findFirst.mockResolvedValueOnce(metadata).mockResolvedValueOnce({
      ...metadata,
      title: 'Updated',
      updatedAt: later,
    })
    mocks.updateMany.mockResolvedValue({ count: 1 })

    const result = await updateApiDocument('user-1', 'doc-1', input, apiDocumentEtag(metadata))
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'doc-1',
          userId: 'user-1',
          updatedAt: now,
        }),
        data: expect.objectContaining({ title: 'Updated' }),
      })
    )
    expect(result.document.title).toBe('Updated')
    expect(result.document).not.toHaveProperty('content')
    expect(result.etag).not.toBe(apiDocumentEtag(metadata))
  })

  test('uses typed validation errors for invalid payloads', () => {
    expect(() => parseCreateApiDocument({ title: '', extra: true })).toThrowError(ApiV1Error)
    expect(() => parseCreateApiDocument({ title: 'unsafe\u001btitle' })).toThrowError(ApiV1Error)
    expect(() => parseUpdateApiDocument({})).toThrowError(
      expect.objectContaining({ status: 422, code: 'validation_error' })
    )
  })
})
