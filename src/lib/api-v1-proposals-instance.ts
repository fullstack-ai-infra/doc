import 'server-only'

import { db } from '@/db/db'
import {
  InMemoryProposalStore,
  ProposalService,
  type DocumentPermissionCheck,
  type ProposalAuditRecorder,
} from '@/lib/api-v1-proposals'
import { encodeTiptapDocument } from '@/lib/tiptap-codec'

/**
 * Singleton instance of the proposal service.
 * Uses in-memory store for now; replace with Prisma-backed store
 * once the ProposalRequest model is added to the schema.
 */

const store = new InMemoryProposalStore()

const permissions: DocumentPermissionCheck = {
  async canWrite(userId: string, documentId: string): Promise<boolean> {
    const doc = await db.doc.findFirst({
      where: { id: documentId, userId, isDeleted: false },
      select: { id: true },
    })
    return doc !== null
  },

  async canReview(userId: string, documentId: string): Promise<boolean> {
    // Document owner can review proposals
    const doc = await db.doc.findFirst({
      where: { id: documentId, userId, isDeleted: false },
      select: { id: true },
    })
    return doc !== null
  },

  async getBaseRevision(documentId: string): Promise<string | null> {
    const doc = await db.doc.findFirst({
      where: { id: documentId, isDeleted: false },
      select: { updatedAt: true },
    })
    if (!doc) return null
    return doc.updatedAt.toISOString()
  },
}

const audit: ProposalAuditRecorder = {
  async record(event) {
    // Will integrate with audit-trail module from issue #5 once merged
    console.info('[proposal-audit]', event.action, event.target, event.outcome)
  },
}

async function executeMutation(
  documentId: string,
  content: Record<string, unknown>,
  _baseRevision: string,
  _operationId: string
): Promise<{ versionId: string }> {
  // Will integrate with active-room mutation from issue #4 once merged.
  // For now, a direct database write for testing purposes.
  const encoded = encodeTiptapDocument(content)
  const version = await db.docVersion.create({
    data: {
      docId: documentId,
      userId: (await db.doc.findFirstOrThrow({ where: { id: documentId }, select: { userId: true } })).userId,
      title: 'Proposal commit',
      content: encoded.contentJson,
      contentBinary: encoded.contentBinary,
    },
    select: { id: true },
  })
  await db.doc.update({
    where: { id: documentId },
    data: {
      content: encoded.contentJson,
      contentBinary: encoded.contentBinary,
    },
  })
  return { versionId: version.id }
}

let instance: ProposalService | null = null

export function getProposalService(): ProposalService {
  if (!instance) {
    instance = new ProposalService(store, permissions, audit, executeMutation)
  }
  return instance
}
