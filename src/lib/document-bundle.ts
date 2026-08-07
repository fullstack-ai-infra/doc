import { createHash } from 'node:crypto'

/**
 * document_bundle.v1 — portable, self-describing workspace bundle for doc.
 *
 * The bundle is one canonical JSON document. Canonical serialization sorts
 * every object key recursively; the `integrity` field is the sha256 of the
 * canonical serialization with `integrity` removed, so a bundle can be
 * inspected and verified fully offline. Yjs binary state is never carried:
 * importers regenerate it from the canonical TipTap JSON, so foreign binary
 * state can never be injected. Validation never touches external state and
 * must pass before any import mutation is planned.
 */
export const DOCUMENT_BUNDLE_SCHEMA = 'document_bundle.v1'

/**
 * Records that must never leave an installation. The list is part of the
 * schema: a bundle that does not declare exactly these exclusions is invalid.
 */
export const REQUIRED_BUNDLE_EXCLUSIONS = [
  'ai.token_usage',
  'auth.accounts',
  'auth.personal_access_tokens',
  'auth.sessions',
  'auth.verification_tokens',
  'identity.user_ids',
  'runtime.environment',
  'share.passwords',
  'share.relations',
  'storage.oss_credentials',
] as const

export const BUNDLE_LIMITS = {
  maxDocuments: 10_000,
  maxVersionsPerDocument: 100,
  maxAssetReferences: 50_000,
  maxTitleLength: 500,
  maxHtmlContentLength: 2_000_000,
  maxStatusReasonLength: 2_000,
} as const

const PUBLISH_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const ORIGIN_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

export type BundleErrorCode =
  'invalid_bundle' | 'unsupported_bundle_version' | 'bundle_limit_exceeded' | 'bundle_integrity_mismatch'

export class BundleError extends Error {
  readonly code: BundleErrorCode

  constructor(code: BundleErrorCode, message: string) {
    super(message)
    this.name = 'BundleError'
    this.code = code
  }
}

export interface BundleVersion {
  originId: string
  title: string
  content: Record<string, unknown>
  createdAt: string
}

export interface BundlePublication {
  publishId: string
  title: string
  htmlContent: string
  status: 'PUBLISHED' | 'FROZEN' | 'UNPUBLISHED'
  statusReason: string | null
  thumbUpCount: number
}

export interface BundleDocument {
  originId: string
  parentOriginId: string | null
  title: string
  icon: string | null
  isStar: boolean
  createdAt: string
  updatedAt: string
  content: Record<string, unknown>
  versions: BundleVersion[]
  publication: BundlePublication | null
}

export interface DocumentBundle {
  schema: typeof DOCUMENT_BUNDLE_SCHEMA
  bundleId: string
  createdAt: string
  source: { exporter: string; exporterVersion: string }
  identity: { owner: 'remapped_on_import'; shareRelations: 'excluded' }
  exclusions: string[]
  assets: { count: number; references: string[] }
  counts: { documents: number; versions: number; publications: number }
  documents: BundleDocument[]
  integrity: string
}

/** Deterministic JSON with recursively sorted object keys. */
export function canonicalBundleJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalBundleJson(entry)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const body = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalBundleJson(record[key])}`)
      .join(',')
    return `{${body}}`
  }
  return JSON.stringify(value)
}

export function computeBundleIntegrity(bundle: Omit<DocumentBundle, 'integrity'>): string {
  return createHash('sha256').update(canonicalBundleJson(bundle)).digest('hex')
}

/**
 * Extracts normalized asset references from TipTap content. Absolute URLs
 * are reduced to their pathname so deployment-only hostnames and signed
 * query strings never enter the bundle; the reference set is the asset
 * manifest and participates in the integrity digest.
 */
export function collectAssetReferences(content: unknown, into = new Set<string>()): Set<string> {
  if (Array.isArray(content)) {
    for (const entry of content) collectAssetReferences(entry, into)
    return into
  }
  if (!content || typeof content !== 'object') return into
  const record = content as Record<string, unknown>
  const attrs = record.attrs
  if (attrs && typeof attrs === 'object' && !Array.isArray(attrs)) {
    const src = (attrs as Record<string, unknown>).src
    if (typeof src === 'string' && src !== '') {
      try {
        into.add(new URL(src).pathname)
      } catch {
        into.add(src)
      }
    }
  }
  if (Array.isArray(record.content)) collectAssetReferences(record.content, into)
  return into
}

function invalid(message: string): BundleError {
  return new BundleError('invalid_bundle', message)
}

function limitExceeded(message: string): BundleError {
  return new BundleError('bundle_limit_exceeded', message)
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw invalid(`${label} carries unknown field: ${key}`)
  }
}

function requireString(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
    throw invalid(`${label} must be a string of 1..${maxLength} characters`)
  }
  return value
}

function requireIsoDate(value: unknown, label: string): string {
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) {
    throw invalid(`${label} must be an ISO-8601 timestamp`)
  }
  return value
}

function requireTiptapDoc(value: unknown, label: string): Record<string, unknown> {
  if (!plainObject(value) || value.type !== 'doc') {
    throw invalid(`${label} must be a TipTap document object`)
  }
  return value
}

function validateVersion(value: unknown, label: string): BundleVersion {
  if (!plainObject(value)) throw invalid(`${label} must be an object`)
  exactKeys(value, ['originId', 'title', 'content', 'createdAt'], label)
  const originId = requireString(value.originId, `${label}.originId`, 128)
  if (!ORIGIN_ID_PATTERN.test(originId)) throw invalid(`${label}.originId is malformed`)
  return {
    originId,
    title: requireString(value.title, `${label}.title`, BUNDLE_LIMITS.maxTitleLength),
    content: requireTiptapDoc(value.content, `${label}.content`),
    createdAt: requireIsoDate(value.createdAt, `${label}.createdAt`),
  }
}

function validatePublication(value: unknown, label: string): BundlePublication {
  if (!plainObject(value)) throw invalid(`${label} must be an object`)
  exactKeys(value, ['publishId', 'title', 'htmlContent', 'status', 'statusReason', 'thumbUpCount'], label)
  const publishId = requireString(value.publishId, `${label}.publishId`, 128)
  if (!PUBLISH_ID_PATTERN.test(publishId)) throw invalid(`${label}.publishId is malformed`)
  if (value.status !== 'PUBLISHED' && value.status !== 'FROZEN' && value.status !== 'UNPUBLISHED') {
    throw invalid(`${label}.status is not a known publication status`)
  }
  if (typeof value.htmlContent !== 'string' || value.htmlContent.length > BUNDLE_LIMITS.maxHtmlContentLength) {
    throw limitExceeded(`${label}.htmlContent exceeds the bundle limit`)
  }
  if (
    value.statusReason !== null &&
    (typeof value.statusReason !== 'string' || value.statusReason.length > BUNDLE_LIMITS.maxStatusReasonLength)
  ) {
    throw invalid(`${label}.statusReason must be null or a bounded string`)
  }
  if (typeof value.thumbUpCount !== 'number' || !Number.isInteger(value.thumbUpCount) || value.thumbUpCount < 0) {
    throw invalid(`${label}.thumbUpCount must be a non-negative integer`)
  }
  return {
    publishId,
    title: requireString(value.title, `${label}.title`, BUNDLE_LIMITS.maxTitleLength),
    htmlContent: value.htmlContent,
    status: value.status,
    statusReason: value.statusReason,
    thumbUpCount: value.thumbUpCount,
  }
}

function validateBundleDocument(value: unknown, label: string): BundleDocument {
  if (!plainObject(value)) throw invalid(`${label} must be an object`)
  exactKeys(
    value,
    [
      'originId',
      'parentOriginId',
      'title',
      'icon',
      'isStar',
      'createdAt',
      'updatedAt',
      'content',
      'versions',
      'publication',
    ],
    label
  )
  const originId = requireString(value.originId, `${label}.originId`, 128)
  if (!ORIGIN_ID_PATTERN.test(originId)) throw invalid(`${label}.originId is malformed`)
  if (value.parentOriginId !== null) {
    const parent = requireString(value.parentOriginId, `${label}.parentOriginId`, 128)
    if (!ORIGIN_ID_PATTERN.test(parent)) throw invalid(`${label}.parentOriginId is malformed`)
  }
  if (value.icon !== null && typeof value.icon !== 'string') {
    throw invalid(`${label}.icon must be null or a string`)
  }
  if (typeof value.isStar !== 'boolean') throw invalid(`${label}.isStar must be a boolean`)
  if (!Array.isArray(value.versions)) throw invalid(`${label}.versions must be an array`)
  if (value.versions.length > BUNDLE_LIMITS.maxVersionsPerDocument) {
    throw limitExceeded(`${label}.versions exceeds ${BUNDLE_LIMITS.maxVersionsPerDocument}`)
  }
  return {
    originId,
    parentOriginId: value.parentOriginId as string | null,
    title: requireString(value.title, `${label}.title`, BUNDLE_LIMITS.maxTitleLength),
    icon: value.icon,
    isStar: value.isStar,
    createdAt: requireIsoDate(value.createdAt, `${label}.createdAt`),
    updatedAt: requireIsoDate(value.updatedAt, `${label}.updatedAt`),
    content: requireTiptapDoc(value.content, `${label}.content`),
    versions: value.versions.map((entry, index) => validateVersion(entry, `${label}.versions[${index}]`)),
    publication: value.publication === null ? null : validatePublication(value.publication, `${label}.publication`),
  }
}

/**
 * Fail-closed validator for one document_bundle.v1 value. Checks schema
 * version, exact field sets, limits, the document tree (unique origin ids,
 * parents present, acyclic), the declared exclusions, the asset manifest,
 * and the offline integrity digest. Performs no I/O and no mutation.
 */
export function validateDocumentBundle(value: unknown): DocumentBundle {
  if (!plainObject(value)) throw invalid('bundle must be a JSON object')
  exactKeys(
    value,
    [
      'schema',
      'bundleId',
      'createdAt',
      'source',
      'identity',
      'exclusions',
      'assets',
      'counts',
      'documents',
      'integrity',
    ],
    'bundle'
  )
  if (value.schema !== DOCUMENT_BUNDLE_SCHEMA) {
    throw new BundleError('unsupported_bundle_version', `bundle schema must be ${DOCUMENT_BUNDLE_SCHEMA}`)
  }
  const bundleId = requireString(value.bundleId, 'bundle.bundleId', 128)
  const createdAt = requireIsoDate(value.createdAt, 'bundle.createdAt')
  if (!plainObject(value.source)) throw invalid('bundle.source must be an object')
  exactKeys(value.source, ['exporter', 'exporterVersion'], 'bundle.source')
  const source = {
    exporter: requireString(value.source.exporter, 'bundle.source.exporter', 128),
    exporterVersion: requireString(value.source.exporterVersion, 'bundle.source.exporterVersion', 64),
  }
  if (!plainObject(value.identity)) throw invalid('bundle.identity must be an object')
  exactKeys(value.identity, ['owner', 'shareRelations'], 'bundle.identity')
  if (value.identity.owner !== 'remapped_on_import' || value.identity.shareRelations !== 'excluded') {
    throw invalid('bundle.identity must declare the v1 remap/exclusion policy')
  }
  const declaredExclusions = value.exclusions
  if (
    !Array.isArray(declaredExclusions) ||
    declaredExclusions.length !== REQUIRED_BUNDLE_EXCLUSIONS.length ||
    REQUIRED_BUNDLE_EXCLUSIONS.some((entry, index) => declaredExclusions[index] !== entry)
  ) {
    throw invalid('bundle.exclusions must declare exactly the v1 required exclusions')
  }
  if (!Array.isArray(value.documents)) throw invalid('bundle.documents must be an array')
  if (value.documents.length > BUNDLE_LIMITS.maxDocuments) {
    throw limitExceeded(`bundle.documents exceeds ${BUNDLE_LIMITS.maxDocuments}`)
  }
  const documents = value.documents.map((entry, index) => validateBundleDocument(entry, `documents[${index}]`))

  const originIds = new Set<string>()
  for (const document of documents) {
    if (originIds.has(document.originId)) {
      throw invalid(`duplicate document originId: ${document.originId}`)
    }
    originIds.add(document.originId)
  }
  const parents = new Map<string, string | null>()
  for (const document of documents) {
    if (document.parentOriginId !== null && !originIds.has(document.parentOriginId)) {
      throw invalid(`document ${document.originId} references a parent outside the bundle`)
    }
    parents.set(document.originId, document.parentOriginId)
  }
  for (const document of documents) {
    const seen = new Set<string>()
    let cursor: string | null = document.originId
    while (cursor !== null) {
      if (seen.has(cursor)) throw invalid('document tree contains a cycle')
      seen.add(cursor)
      cursor = parents.get(cursor) ?? null
    }
  }
  const seenPublishIds = new Set<string>()
  for (const document of documents) {
    if (document.publication && seenPublishIds.has(document.publication.publishId)) {
      throw invalid(`duplicate publishId: ${document.publication.publishId}`)
    }
    if (document.publication) seenPublishIds.add(document.publication.publishId)
  }

  if (!plainObject(value.assets)) throw invalid('bundle.assets must be an object')
  exactKeys(value.assets, ['count', 'references'], 'bundle.assets')
  const declaredReferences = value.assets.references
  if (!Array.isArray(declaredReferences)) {
    throw invalid('bundle.assets.references must be an array')
  }
  if (declaredReferences.length > BUNDLE_LIMITS.maxAssetReferences) {
    throw limitExceeded('bundle.assets.references exceeds the bundle limit')
  }
  const expectedReferences = new Set<string>()
  for (const document of documents) {
    collectAssetReferences(document.content, expectedReferences)
    for (const version of document.versions) {
      collectAssetReferences(version.content, expectedReferences)
    }
  }
  const expected = [...expectedReferences].sort()
  if (
    value.assets.count !== expected.length ||
    declaredReferences.length !== expected.length ||
    expected.some((entry, index) => declaredReferences[index] !== entry)
  ) {
    throw invalid('bundle.assets manifest does not match the bundled content')
  }

  if (!plainObject(value.counts)) throw invalid('bundle.counts must be an object')
  exactKeys(value.counts, ['documents', 'versions', 'publications'], 'bundle.counts')
  const versionTotal = documents.reduce((total, document) => total + document.versions.length, 0)
  const publicationTotal = documents.filter((document) => document.publication !== null).length
  if (
    value.counts.documents !== documents.length ||
    value.counts.versions !== versionTotal ||
    value.counts.publications !== publicationTotal
  ) {
    throw invalid('bundle.counts do not match the bundled content')
  }

  const integrity = value.integrity
  if (typeof integrity !== 'string' || !SHA256_PATTERN.test(integrity)) {
    throw invalid('bundle.integrity must be a sha256 hex digest')
  }
  const bundle: DocumentBundle = {
    schema: DOCUMENT_BUNDLE_SCHEMA,
    bundleId,
    createdAt,
    source,
    identity: { owner: 'remapped_on_import', shareRelations: 'excluded' },
    exclusions: [...REQUIRED_BUNDLE_EXCLUSIONS],
    assets: { count: expected.length, references: expected },
    counts: {
      documents: documents.length,
      versions: versionTotal,
      publications: publicationTotal,
    },
    documents,
    integrity,
  }
  const { integrity: _ignored, ...withoutIntegrity } = bundle
  const computed = computeBundleIntegrity(withoutIntegrity)
  if (computed !== integrity) {
    throw new BundleError('bundle_integrity_mismatch', 'bundle integrity digest does not match the canonical content')
  }
  return bundle
}

export interface ExportableDocument {
  id: string
  parentId: string | null
  title: string
  icon: string | null
  isStar: boolean
  createdAt: Date
  updatedAt: Date
  content: string
  versions: Array<{ id: string; title: string; content: string; createdAt: Date }>
  publication: {
    publishId: string
    title: string
    htmlContent: string
    status: 'PUBLISHED' | 'FROZEN' | 'UNPUBLISHED'
    statusReason: string | null
    thumbUpCount: number
  } | null
}

function parseStoredTiptap(raw: string, label: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw invalid(`${label} stored content is not valid JSON`)
  }
  return requireTiptapDoc(parsed, label)
}

/**
 * Projects owned database rows into a sealed document_bundle.v1 value.
 * Parents outside the exported set become roots; instance-local user ids,
 * share relations and every excluded record class never enter the bundle.
 */
export function buildDocumentBundle(options: {
  documents: ExportableDocument[]
  bundleId: string
  createdAt: string
  exporterVersion: string
}): DocumentBundle {
  const exportedIds = new Set(options.documents.map((document) => document.id))
  const assetReferences = new Set<string>()
  const documents: BundleDocument[] = options.documents.map((document) => {
    const content = parseStoredTiptap(document.content, `document ${document.id}`)
    collectAssetReferences(content, assetReferences)
    const versions = document.versions.map((version) => {
      const versionContent = parseStoredTiptap(version.content, `version ${version.id}`)
      collectAssetReferences(versionContent, assetReferences)
      return {
        originId: version.id,
        title: version.title,
        content: versionContent,
        createdAt: version.createdAt.toISOString(),
      }
    })
    return {
      originId: document.id,
      parentOriginId: document.parentId !== null && exportedIds.has(document.parentId) ? document.parentId : null,
      title: document.title,
      icon: document.icon,
      isStar: document.isStar,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
      content,
      versions,
      publication: document.publication
        ? {
            publishId: document.publication.publishId,
            title: document.publication.title,
            htmlContent: document.publication.htmlContent,
            status: document.publication.status,
            statusReason: document.publication.statusReason,
            thumbUpCount: document.publication.thumbUpCount,
          }
        : null,
    }
  })
  const references = [...assetReferences].sort()
  const withoutIntegrity: Omit<DocumentBundle, 'integrity'> = {
    schema: DOCUMENT_BUNDLE_SCHEMA,
    bundleId: options.bundleId,
    createdAt: options.createdAt,
    source: { exporter: 'doc-web', exporterVersion: options.exporterVersion },
    identity: { owner: 'remapped_on_import', shareRelations: 'excluded' },
    exclusions: [...REQUIRED_BUNDLE_EXCLUSIONS],
    assets: { count: references.length, references },
    counts: {
      documents: documents.length,
      versions: documents.reduce((total, document) => total + document.versions.length, 0),
      publications: documents.filter((document) => document.publication !== null).length,
    },
    documents,
  }
  return { ...withoutIntegrity, integrity: computeBundleIntegrity(withoutIntegrity) }
}
