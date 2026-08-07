import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { db } from '@/db/db'
import { ApiV1Error } from '@/lib/api-v1'
import { z } from 'zod'

/**
 * Proposal workflow for AI edits:
 *   draft proposal -> validation -> pending review -> approved/denied/expired -> idempotent commit
 *
 * Depends on:
 * - active-room mutation gateway (issue #4) for executing approved proposals
 * - audit trail (issue #5) for recording proposal/reviewer/execution correlation
 */

// --- State Machine ---

export type ProposalStatus =
  | 'pending_review'
  | 'approved'
  | 'denied'
  | 'expired'
  | 'committed'

const TERMINAL_STATES: readonly ProposalStatus[] = ['denied', 'expired', 'committed']

// --- Schemas ---

export const createProposalSchema = z
  .object({
    documentId: z.string().min(1),
    baseRevision: z.string().min(1).max(200),
    diff: z.record(z.unknown()),
    proposedContent: z.record(z.unknown()),
    rationale: z.string().min(1).max(4000),
    evidenceLocators: z.array(z.string().max(500)).max(20).optional(),
    requestedCapability: z.string().max(100).optional(),
    expiresInSeconds: z.number().int().min(60).max(86400).optional(),
    idempotencyKey: z.string().min(1).max(128).optional(),
  })
  .strict()

export const reviewProposalSchema = z
  .object({
    decision: z.enum(['approve', 'deny']),
    reviewComment: z.string().max(2000).optional(),
  })
  .strict()

// --- Types ---

export interface Proposal {
  id: string
  documentId: string
  baseRevision: string
  diff: Record<string, unknown>
  proposedContent: Record<string, unknown>
  rationale: string
  evidenceLocators: string[]
  requestedCapability: string | null
  proposerId: string
  status: ProposalStatus
  reviewerId: string | null
  reviewComment: string | null
  reviewedAt: Date | null
  committedAt: Date | null
  commitOperationId: string | null
  expiresAt: Date
  idempotencyKey: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateProposalResult {
  proposalId: string
  status: ProposalStatus
  expiresAt: string
}

export interface ReviewResult {
  proposalId: string
  status: ProposalStatus
  reviewerId: string
}

export interface CommitResult {
  proposalId: string
  status: 'committed'
  operationId: string
  versionId: string
}

// --- Storage Interface ---

export interface ProposalStore {
  create(proposal: Omit<Proposal, 'updatedAt'>): Promise<Proposal>
  findById(id: string): Promise<Proposal | null>
  findByIdempotencyKey(proposerId: string, key: string): Promise<Proposal | null>
  updateStatus(
    id: string,
    update: Partial<Pick<Proposal, 'status' | 'reviewerId' | 'reviewComment' | 'reviewedAt' | 'committedAt' | 'commitOperationId'>>
  ): Promise<Proposal>
  listByDocument(documentId: string, options?: { status?: ProposalStatus; limit?: number; offset?: number }): Promise<Proposal[]>
}

// --- In-memory store for testing / single-node ---

export class InMemoryProposalStore implements ProposalStore {
  private proposals = new Map<string, Proposal>()

  async create(proposal: Omit<Proposal, 'updatedAt'>): Promise<Proposal> {
    const full: Proposal = { ...proposal, updatedAt: new Date() }
    this.proposals.set(full.id, full)
    return full
  }

  async findById(id: string): Promise<Proposal | null> {
    return this.proposals.get(id) ?? null
  }

  async findByIdempotencyKey(proposerId: string, key: string): Promise<Proposal | null> {
    for (const p of this.proposals.values()) {
      if (p.proposerId === proposerId && p.idempotencyKey === key) return p
    }
    return null
  }

  async updateStatus(
    id: string,
    update: Partial<Pick<Proposal, 'status' | 'reviewerId' | 'reviewComment' | 'reviewedAt' | 'committedAt' | 'commitOperationId'>>
  ): Promise<Proposal> {
    const existing = this.proposals.get(id)
    if (!existing) throw new Error(`Proposal ${id} not found`)
    const updated: Proposal = { ...existing, ...update, updatedAt: new Date() }
    this.proposals.set(id, updated)
    return updated
  }

  async listByDocument(
    documentId: string,
    options?: { status?: ProposalStatus; limit?: number; offset?: number }
  ): Promise<Proposal[]> {
    let results = [...this.proposals.values()].filter((p) => p.documentId === documentId)
    if (options?.status) results = results.filter((p) => p.status === options.status)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const offset = options?.offset ?? 0
    const limit = options?.limit ?? 50
    return results.slice(offset, offset + limit)
  }

  clear(): void {
    this.proposals.clear()
  }
}

// --- Document Permission Check Interface ---

export interface DocumentPermissionCheck {
  canWrite(userId: string, documentId: string): Promise<boolean>
  canReview(userId: string, documentId: string): Promise<boolean>
  getBaseRevision(documentId: string): Promise<string | null>
}

// --- Audit Interface (from issue #5) ---

export interface ProposalAuditRecorder {
  record(event: {
    actor: string
    action: string
    target: string
    outcome: 'success' | 'failure'
    metadata?: Record<string, unknown>
    correlationId?: string
  }): Promise<void>
}

// --- Core Service ---

export class ProposalService {
  constructor(
    private readonly store: ProposalStore,
    private readonly permissions: DocumentPermissionCheck,
    private readonly audit: ProposalAuditRecorder,
    private readonly executeMutation: (
      documentId: string,
      content: Record<string, unknown>,
      baseRevision: string,
      operationId: string
    ) => Promise<{ versionId: string }>
  ) {}

  async createProposal(
    proposerId: string,
    input: z.infer<typeof createProposalSchema>
  ): Promise<CreateProposalResult> {
    // Idempotency check
    if (input.idempotencyKey) {
      const existing = await this.store.findByIdempotencyKey(proposerId, input.idempotencyKey)
      if (existing) {
        return {
          proposalId: existing.id,
          status: existing.status,
          expiresAt: existing.expiresAt.toISOString(),
        }
      }
    }

    // Permission check at creation time (also rechecked at commit)
    const canWrite = await this.permissions.canWrite(proposerId, input.documentId)
    if (!canWrite) {
      await this.audit.record({
        actor: proposerId,
        action: 'proposal.create',
        target: input.documentId,
        outcome: 'failure',
        metadata: { reason: 'permission_denied' },
      })
      throw new ApiV1Error(403, 'permission_denied', 'Insufficient permission to propose changes')
    }

    // Validate base revision exists
    const currentRevision = await this.permissions.getBaseRevision(input.documentId)
    if (currentRevision === null) {
      throw new ApiV1Error(404, 'document_not_found', 'Target document does not exist')
    }

    const expiresInSeconds = input.expiresInSeconds ?? 3600
    const now = new Date()
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000)

    const proposal = await this.store.create({
      id: randomUUID(),
      documentId: input.documentId,
      baseRevision: input.baseRevision,
      diff: input.diff,
      proposedContent: input.proposedContent,
      rationale: input.rationale,
      evidenceLocators: input.evidenceLocators ?? [],
      requestedCapability: input.requestedCapability ?? null,
      proposerId,
      status: 'pending_review',
      reviewerId: null,
      reviewComment: null,
      reviewedAt: null,
      committedAt: null,
      commitOperationId: null,
      expiresAt,
      idempotencyKey: input.idempotencyKey ?? null,
      createdAt: now,
    })

    await this.audit.record({
      actor: proposerId,
      action: 'proposal.create',
      target: input.documentId,
      outcome: 'success',
      metadata: { proposalId: proposal.id, baseRevision: input.baseRevision },
      correlationId: proposal.id,
    })

    return {
      proposalId: proposal.id,
      status: proposal.status,
      expiresAt: proposal.expiresAt.toISOString(),
    }
  }

  async getProposal(userId: string, proposalId: string): Promise<Proposal> {
    const proposal = await this.store.findById(proposalId)
    if (!proposal) {
      throw new ApiV1Error(404, 'proposal_not_found', 'Proposal does not exist')
    }
    // Check permission to view
    const canReview = await this.permissions.canReview(userId, proposal.documentId)
    const isProposer = proposal.proposerId === userId
    if (!canReview && !isProposer) {
      throw new ApiV1Error(403, 'permission_denied', 'Cannot view this proposal')
    }
    return proposal
  }

  async reviewProposal(
    reviewerId: string,
    proposalId: string,
    input: z.infer<typeof reviewProposalSchema>
  ): Promise<ReviewResult> {
    const proposal = await this.store.findById(proposalId)
    if (!proposal) {
      throw new ApiV1Error(404, 'proposal_not_found', 'Proposal does not exist')
    }

    // Check expiration
    if (new Date() > proposal.expiresAt) {
      await this.store.updateStatus(proposalId, { status: 'expired' })
      await this.audit.record({
        actor: reviewerId,
        action: 'proposal.review',
        target: proposal.documentId,
        outcome: 'failure',
        metadata: { proposalId, reason: 'expired' },
        correlationId: proposalId,
      })
      throw new ApiV1Error(410, 'proposal_expired', 'Proposal has expired')
    }

    // Must be in pending_review state
    if (proposal.status !== 'pending_review') {
      throw new ApiV1Error(
        409,
        'invalid_proposal_state',
        `Proposal is in state '${proposal.status}' and cannot be reviewed`
      )
    }

    // Permission check
    const canReview = await this.permissions.canReview(reviewerId, proposal.documentId)
    if (!canReview) {
      await this.audit.record({
        actor: reviewerId,
        action: 'proposal.review',
        target: proposal.documentId,
        outcome: 'failure',
        metadata: { proposalId, reason: 'permission_denied' },
        correlationId: proposalId,
      })
      throw new ApiV1Error(403, 'permission_denied', 'Insufficient permission to review proposals')
    }

    const newStatus: ProposalStatus = input.decision === 'approve' ? 'approved' : 'denied'
    const updated = await this.store.updateStatus(proposalId, {
      status: newStatus,
      reviewerId,
      reviewComment: input.reviewComment ?? null,
      reviewedAt: new Date(),
    })

    await this.audit.record({
      actor: reviewerId,
      action: `proposal.${input.decision}`,
      target: proposal.documentId,
      outcome: 'success',
      metadata: { proposalId, decision: input.decision },
      correlationId: proposalId,
    })

    return {
      proposalId: updated.id,
      status: updated.status,
      reviewerId,
    }
  }

  async commitProposal(
    actorId: string,
    proposalId: string
  ): Promise<CommitResult> {
    const proposal = await this.store.findById(proposalId)
    if (!proposal) {
      throw new ApiV1Error(404, 'proposal_not_found', 'Proposal does not exist')
    }

    // Idempotent: already committed
    if (proposal.status === 'committed') {
      return {
        proposalId: proposal.id,
        status: 'committed',
        operationId: proposal.commitOperationId!,
        versionId: proposal.commitOperationId!, // Same operation
      }
    }

    // Must be approved
    if (proposal.status !== 'approved') {
      const reason =
        proposal.status === 'denied'
          ? 'Proposal was denied'
          : proposal.status === 'expired'
            ? 'Proposal has expired'
            : `Proposal is in state '${proposal.status}'`
      throw new ApiV1Error(409, 'invalid_proposal_state', reason)
    }

    // Check expiration at commit time too
    if (new Date() > proposal.expiresAt) {
      await this.store.updateStatus(proposalId, { status: 'expired' })
      throw new ApiV1Error(410, 'proposal_expired', 'Proposal has expired')
    }

    // Recheck document permission at execution time
    const canWrite = await this.permissions.canWrite(actorId, proposal.documentId)
    if (!canWrite) {
      await this.audit.record({
        actor: actorId,
        action: 'proposal.commit',
        target: proposal.documentId,
        outcome: 'failure',
        metadata: { proposalId, reason: 'permission_revoked' },
        correlationId: proposalId,
      })
      throw new ApiV1Error(403, 'permission_revoked', 'Permission was revoked since approval')
    }

    // Recheck base revision
    const currentRevision = await this.permissions.getBaseRevision(proposal.documentId)
    if (currentRevision !== proposal.baseRevision) {
      await this.audit.record({
        actor: actorId,
        action: 'proposal.commit',
        target: proposal.documentId,
        outcome: 'failure',
        metadata: {
          proposalId,
          reason: 'base_revision_conflict',
          expected: proposal.baseRevision,
          actual: currentRevision,
        },
        correlationId: proposalId,
      })
      throw new ApiV1Error(
        409,
        'base_revision_conflict',
        'Document has been modified since the proposal was created; revise and resubmit'
      )
    }

    // Execute mutation through the collaboration layer
    const operationId = randomUUID()
    let versionId: string
    try {
      const result = await this.executeMutation(
        proposal.documentId,
        proposal.proposedContent,
        proposal.baseRevision,
        operationId
      )
      versionId = result.versionId
    } catch (error) {
      await this.audit.record({
        actor: actorId,
        action: 'proposal.commit',
        target: proposal.documentId,
        outcome: 'failure',
        metadata: { proposalId, reason: 'mutation_failed' },
        correlationId: proposalId,
      })
      throw error
    }

    await this.store.updateStatus(proposalId, {
      status: 'committed',
      committedAt: new Date(),
      commitOperationId: operationId,
    })

    await this.audit.record({
      actor: actorId,
      action: 'proposal.commit',
      target: proposal.documentId,
      outcome: 'success',
      metadata: {
        proposalId,
        operationId,
        versionId,
        reviewerId: proposal.reviewerId,
      },
      correlationId: proposalId,
    })

    return {
      proposalId: proposal.id,
      status: 'committed',
      operationId,
      versionId,
    }
  }

  async listProposals(
    userId: string,
    documentId: string,
    options?: { status?: ProposalStatus; limit?: number; offset?: number }
  ): Promise<Proposal[]> {
    const canReview = await this.permissions.canReview(userId, documentId)
    if (!canReview) {
      throw new ApiV1Error(403, 'permission_denied', 'Cannot list proposals for this document')
    }
    return this.store.listByDocument(documentId, options)
  }
}
