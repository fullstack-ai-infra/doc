import { describe, expect, it } from 'vitest'
import {
  BUNDLE_LIMITS,
  BundleError,
  DOCUMENT_BUNDLE_SCHEMA,
  REQUIRED_BUNDLE_EXCLUSIONS,
  buildDocumentBundle,
  collectAssetReferences,
  computeBundleIntegrity,
  validateDocumentBundle,
  type ExportableDocument,
} from '@/lib/document-bundle'

const CREATED = new Date('2026-08-06T10:00:00.000Z')

function tiptap(text: string, imageSrc?: string) {
  const content: Array<Record<string, unknown>> = [{ type: 'paragraph', content: [{ type: 'text', text }] }]
  if (imageSrc) content.push({ type: 'imageBlock', attrs: { src: imageSrc } })
  return { type: 'doc', content }
}

function exportableDocument(overrides: Partial<ExportableDocument> = {}): ExportableDocument {
  return {
    id: 'doc-a',
    parentId: null,
    title: 'Runbook',
    icon: null,
    isStar: false,
    createdAt: CREATED,
    updatedAt: CREATED,
    content: JSON.stringify(tiptap('current body', 'https://cdn.example/files/u-123/imgs/x.png')),
    versions: [
      {
        id: 'ver-1',
        title: 'Runbook',
        content: JSON.stringify(tiptap('older body')),
        createdAt: CREATED,
      },
    ],
    publication: {
      publishId: 'runbook-public',
      title: 'Runbook',
      htmlContent: '<p>current body</p>',
      status: 'PUBLISHED',
      statusReason: null,
      thumbUpCount: 3,
    },
    ...overrides,
  }
}

function sealedBundle(documents: ExportableDocument[] = [exportableDocument()]) {
  return buildDocumentBundle({
    documents,
    bundleId: 'bundle-test-1',
    createdAt: '2026-08-06T10:30:00.000Z',
    exporterVersion: '0.1.0',
  })
}

describe('document_bundle.v1', () => {
  it('round-trips build → serialize → validate', () => {
    const bundle = sealedBundle()
    const revalidated = validateDocumentBundle(JSON.parse(JSON.stringify(bundle)))
    expect(revalidated.integrity).toBe(bundle.integrity)
    expect(revalidated.counts).toEqual({ documents: 1, versions: 1, publications: 1 })
    expect(revalidated.exclusions).toEqual([...REQUIRED_BUNDLE_EXCLUSIONS])
    expect(revalidated.documents[0].content).toEqual(JSON.parse(exportableDocument().content))
  })

  it('normalizes asset references to pathnames and manifests them', () => {
    const bundle = sealedBundle()
    expect(bundle.assets.references).toEqual(['/files/u-123/imgs/x.png'])
    expect(bundle.assets.count).toBe(1)
    const set = collectAssetReferences(tiptap('x', 'relative/asset.png'))
    expect([...set]).toEqual(['relative/asset.png'])
  })

  it('detects any post-seal tampering through the integrity digest', () => {
    const bundle = JSON.parse(JSON.stringify(sealedBundle()))
    bundle.documents[0].title = 'Tampered'
    expect(() => validateDocumentBundle(bundle)).toThrowError(
      expect.objectContaining({ code: 'bundle_integrity_mismatch' })
    )
  })

  it('rejects unknown schema versions before anything else', () => {
    const bundle = JSON.parse(JSON.stringify(sealedBundle()))
    bundle.schema = 'document_bundle.v2'
    expect(() => validateDocumentBundle(bundle)).toThrowError(
      expect.objectContaining({ code: 'unsupported_bundle_version' })
    )
  })

  it('rejects unknown fields at every level', () => {
    const top = JSON.parse(JSON.stringify(sealedBundle()))
    top.vendor = 'smuggled'
    expect(() => validateDocumentBundle(top)).toThrowError(BundleError)

    const nested = JSON.parse(JSON.stringify(sealedBundle()))
    nested.documents[0].sessionToken = 'smuggled'
    expect(() => validateDocumentBundle(nested)).toThrowError(BundleError)
  })

  it('rejects a tampered exclusions declaration', () => {
    const bundle = JSON.parse(JSON.stringify(sealedBundle()))
    bundle.exclusions = bundle.exclusions.slice(1)
    expect(() => validateDocumentBundle(bundle)).toThrowError(expect.objectContaining({ code: 'invalid_bundle' }))
  })

  it('rejects duplicate origin ids, foreign parents and cycles', () => {
    const duplicate = JSON.parse(
      JSON.stringify(sealedBundle([exportableDocument(), exportableDocument({ versions: [], publication: null })]))
    )
    expect(() => validateDocumentBundle(duplicate)).toThrowError(BundleError)

    const foreignParent = sealedBundle([exportableDocument({ parentId: 'not-exported' })])
    expect(foreignParent.documents[0].parentOriginId).toBeNull()

    const cyclic = JSON.parse(JSON.stringify(sealedBundle()))
    cyclic.documents[0].parentOriginId = 'doc-a'
    expect(() => validateDocumentBundle(cyclic)).toThrowError(BundleError)
  })

  it('rejects an asset manifest that does not match the content', () => {
    const bundle = JSON.parse(JSON.stringify(sealedBundle()))
    bundle.assets.references = []
    bundle.assets.count = 0
    expect(() => validateDocumentBundle(bundle)).toThrowError(BundleError)
  })

  it('enforces the documented limits', () => {
    const documents = Array.from({ length: BUNDLE_LIMITS.maxDocuments + 1 }, (_, index) =>
      exportableDocument({
        id: `doc-${index}`,
        versions: [],
        publication: null,
        content: JSON.stringify(tiptap('x')),
      })
    )
    const oversized = sealedBundle(documents)
    expect(() => validateDocumentBundle(JSON.parse(JSON.stringify(oversized)))).toThrowError(
      expect.objectContaining({ code: 'bundle_limit_exceeded' })
    )
  })

  it('keeps the canonical serialization key-order independent', () => {
    const bundle = sealedBundle()
    const { integrity, ...rest } = bundle
    const shuffled = Object.fromEntries(Object.entries(rest).reverse()) as typeof rest
    expect(computeBundleIntegrity(shuffled)).toBe(integrity)
  })

  it(`declares schema ${DOCUMENT_BUNDLE_SCHEMA} and never carries binary state`, () => {
    const serialized = JSON.stringify(sealedBundle())
    expect(serialized).toContain(DOCUMENT_BUNDLE_SCHEMA)
    expect(serialized).not.toContain('contentBinary')
    expect(serialized).not.toContain('sharePassword')
    expect(serialized).not.toContain('userId')
  })
})
