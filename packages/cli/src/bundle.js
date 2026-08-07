import { createHash } from 'node:crypto'

export const DOCUMENT_BUNDLE_SCHEMA = 'document_bundle.v1'

export class BundleInspectError extends Error {
  constructor(message, code = 'invalid_bundle') {
    super(message)
    this.name = 'BundleInspectError'
    this.code = code
  }
}

/** Deterministic JSON with recursively sorted object keys (mirror of the server rule). */
export function canonicalBundleJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalBundleJson(entry)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    const body = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalBundleJson(value[key])}`)
      .join(',')
    return `{${body}}`
  }
  return JSON.stringify(value)
}

/**
 * Offline structural inspection of one document_bundle.v1 value: verifies the
 * schema id and the integrity digest over the canonical serialization, then
 * summarizes counts, assets and declared exclusions. Full semantic
 * validation happens server-side before any import mutation.
 */
export function inspectBundle(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BundleInspectError('bundle must be a JSON object')
  }
  if (value.schema !== DOCUMENT_BUNDLE_SCHEMA) {
    throw new BundleInspectError(`bundle schema must be ${DOCUMENT_BUNDLE_SCHEMA}`, 'unsupported_bundle_version')
  }
  if (typeof value.integrity !== 'string' || !/^[0-9a-f]{64}$/.test(value.integrity)) {
    throw new BundleInspectError('bundle.integrity must be a sha256 hex digest')
  }
  const { integrity, ...withoutIntegrity } = value
  const computed = createHash('sha256').update(canonicalBundleJson(withoutIntegrity)).digest('hex')
  if (computed !== integrity) {
    throw new BundleInspectError(
      'bundle integrity digest does not match the canonical content',
      'bundle_integrity_mismatch'
    )
  }
  const counts = value.counts && typeof value.counts === 'object' ? value.counts : {}
  const assets = value.assets && typeof value.assets === 'object' ? value.assets : {}
  return {
    schema: value.schema,
    bundleId: typeof value.bundleId === 'string' ? value.bundleId : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : null,
    source: value.source && typeof value.source === 'object' ? value.source : null,
    counts: {
      documents: typeof counts.documents === 'number' ? counts.documents : null,
      versions: typeof counts.versions === 'number' ? counts.versions : null,
      publications: typeof counts.publications === 'number' ? counts.publications : null,
    },
    assetCount: typeof assets.count === 'number' ? assets.count : null,
    exclusions: Array.isArray(value.exclusions) ? value.exclusions : [],
    integrity: 'verified',
  }
}
