import 'server-only'

import { randomUUID } from 'node:crypto'
import { db } from '@/db/db'
import { MAX_DOC_COUNT } from '@/constants'
import { ApiV1Error } from '@/lib/api-v1'
import {
  BundleError,
  buildDocumentBundle,
  validateDocumentBundle,
  type BundleDocument,
  type DocumentBundle,
  type ExportableDocument,
} from '@/lib/document-bundle'
import { encodeTiptapDocument } from '@/lib/tiptap-codec'
import { sanitizePublishedHtml } from '@/lib/sanitize-published-html'
import { getNextSortOrderForParent } from '@/lib/doc-sort-order'

const EXPORTER_VERSION = '0.1.0'
const MAX_IMPORT_VERSIONS_TOTAL = 2_000

function bundleErrorToApi(error: unknown): never {
  if (error instanceof BundleError) {
    if (error.code === 'unsupported_bundle_version') {
      throw new ApiV1Error(422, 'unsupported_bundle_version', error.message)
    }
    if (error.code === 'bundle_limit_exceeded') {
      throw new ApiV1Error(413, 'bundle_limit_exceeded', error.message)
    }
    if (error.code === 'bundle_integrity_mismatch') {
      throw new ApiV1Error(422, 'bundle_integrity_mismatch', error.message)
    }
    throw new ApiV1Error(422, 'invalid_bundle', error.message)
  }
  throw error
}

/** Exports every non-deleted document owned by userId as a sealed bundle. */
export async function exportDocumentBundle(userId: string): Promise<DocumentBundle> {
  const rows = await db.doc.findMany({
    where: { userId, isDeleted: false },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      parentId: true,
      title: true,
      icon: true,
      isStar: true,
      createdAt: true,
      updatedAt: true,
      content: true,
      versions: {
        orderBy: { createdAt: 'asc' },
        select: { id: true, title: true, content: true, createdAt: true },
      },
      pubDoc: {
        select: {
          publishId: true,
          title: true,
          htmlContent: true,
          status: true,
          statusReason: true,
          thumbUpCount: true,
        },
      },
    },
  })
  const documents: ExportableDocument[] = rows.map((row) => ({
    id: row.id,
    parentId: row.parentId,
    title: row.title,
    icon: row.icon,
    isStar: row.isStar,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    content: row.content,
    versions: row.versions,
    publication: row.pubDoc[0] ?? null,
  }))
  try {
    return buildDocumentBundle({
      documents,
      bundleId: randomUUID(),
      createdAt: new Date().toISOString(),
      exporterVersion: EXPORTER_VERSION,
    })
  } catch (error) {
    bundleErrorToApi(error)
  }
}

export interface ImportPublicationResult {
  originId: string
  publishId: string
  outcome: 'imported_unpublished' | 'skipped_publish_id_conflict'
}

export interface ImportBundleResult {
  bundleId: string
  documents: number
  versions: number
  publications: ImportPublicationResult[]
  rootDocumentIds: string[]
}

function orderByParents(documents: BundleDocument[]): BundleDocument[] {
  // Parents before children so parentId remapping can resolve in one pass.
  // The validator has already proven the tree is acyclic and closed.
  const remaining = new Map(documents.map((document) => [document.originId, document]))
  const ordered: BundleDocument[] = []
  const placed = new Set<string>()
  while (remaining.size > 0) {
    for (const [originId, document] of remaining) {
      if (document.parentOriginId === null || placed.has(document.parentOriginId)) {
        ordered.push(document)
        placed.add(originId)
        remaining.delete(originId)
      }
    }
  }
  return ordered
}

/**
 * Validates a bundle fully offline, then applies it in one transaction:
 * every document gets a fresh id owned by the importer, Yjs binary state is
 * regenerated from the canonical TipTap JSON, publications are re-sanitized
 * and always imported unpublished (colliding publishIds are skipped and
 * reported). All-or-nothing: any failure rolls the whole import back.
 */
export async function importDocumentBundle(userId: string, value: unknown): Promise<ImportBundleResult> {
  let bundle: DocumentBundle
  try {
    bundle = validateDocumentBundle(value)
  } catch (error) {
    bundleErrorToApi(error)
  }
  if (bundle.counts.versions > MAX_IMPORT_VERSIONS_TOTAL) {
    throw new ApiV1Error(413, 'bundle_limit_exceeded', `bundle carries more than ${MAX_IMPORT_VERSIONS_TOTAL} versions`)
  }
  const existing = await db.doc.count({ where: { userId, isDeleted: false } })
  if (existing + bundle.counts.documents > MAX_DOC_COUNT) {
    throw new ApiV1Error(
      429,
      'document_limit_reached',
      `import would exceed the ${MAX_DOC_COUNT} active document limit`
    )
  }

  // Encode (and thereby validate) all content before any mutation.
  const encoded = new Map<
    string,
    { content: string; contentBinary: Buffer; versions: Array<{ content: string; contentBinary: Buffer }> }
  >()
  for (const document of bundle.documents) {
    const main = encodeTiptapDocument(document.content)
    encoded.set(document.originId, {
      content: main.contentJson,
      contentBinary: main.contentBinary,
      versions: document.versions.map((version) => {
        const encodedVersion = encodeTiptapDocument(version.content)
        return {
          content: encodedVersion.contentJson,
          contentBinary: encodedVersion.contentBinary,
        }
      }),
    })
  }
  const sanitizedPublications = new Map<string, string>()
  for (const document of bundle.documents) {
    if (document.publication) {
      sanitizedPublications.set(document.originId, sanitizePublishedHtml(document.publication.htmlContent))
    }
  }
  const bundledPublishIds = bundle.documents
    .filter((document) => document.publication !== null)
    .map((document) => document.publication!.publishId)
  const conflicting = new Set(
    (
      await db.pubDoc.findMany({
        where: { publishId: { in: bundledPublishIds } },
        select: { publishId: true },
      })
    ).map((row) => row.publishId)
  )

  const ordered = orderByParents(bundle.documents)
  const baseSortOrder = await getNextSortOrderForParent(userId, null)
  const publications: ImportPublicationResult[] = []
  const rootDocumentIds: string[] = []

  await db.$transaction(async (tx) => {
    const idMap = new Map<string, string>()
    let rootOffset = 0
    for (const document of ordered) {
      const payload = encoded.get(document.originId)!
      const parentId = document.parentOriginId === null ? null : idMap.get(document.parentOriginId)!
      const created = await tx.doc.create({
        data: {
          title: document.title,
          icon: document.icon,
          isStar: document.isStar,
          content: payload.content,
          contentBinary: payload.contentBinary,
          userId,
          parentId,
          sortOrder: parentId === null ? baseSortOrder + rootOffset++ : 0,
        },
        select: { id: true },
      })
      idMap.set(document.originId, created.id)
      if (parentId === null) rootDocumentIds.push(created.id)
      for (let index = 0; index < document.versions.length; index++) {
        await tx.docVersion.create({
          data: {
            docId: created.id,
            userId,
            title: document.versions[index].title,
            content: payload.versions[index].content,
            contentBinary: payload.versions[index].contentBinary,
            createdAt: new Date(document.versions[index].createdAt),
          },
        })
      }
      if (document.publication) {
        if (conflicting.has(document.publication.publishId)) {
          publications.push({
            originId: document.originId,
            publishId: document.publication.publishId,
            outcome: 'skipped_publish_id_conflict',
          })
        } else {
          await tx.pubDoc.create({
            data: {
              publishId: document.publication.publishId,
              title: document.publication.title,
              htmlContent: sanitizedPublications.get(document.originId)!,
              docId: created.id,
              userId,
              status: 'UNPUBLISHED',
              statusReason: null,
              thumbUpCount: 0,
            },
          })
          publications.push({
            originId: document.originId,
            publishId: document.publication.publishId,
            outcome: 'imported_unpublished',
          })
        }
      }
    }
  })

  return {
    bundleId: bundle.bundleId,
    documents: bundle.counts.documents,
    versions: bundle.counts.versions,
    publications,
    rootDocumentIds,
  }
}
