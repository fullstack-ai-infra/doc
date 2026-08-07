import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/db/db', () => ({ db: {} }))

import {
  ProposalService,
  InMemoryProposalStore,
  type DocumentPermissionCheck,
  type ProposalAuditRecorder,
} from '@/lib/api-v1-proposals'

function createMocks() {
  const store = new InMemoryProposalStore()

  const permissions: DocumentPermissionCheck = {
    canWrite: vi.fn().mockResolvedValue(true),
    canReview: vi.fn().mockResolvedValue(true),
    getBaseRevision: vi.fn().mockResolvedValue('2026-08-01T00:00:00.000Z'),
  }

  const audit: ProposalAuditRecorder = {
    record: vi.fn().mockResolvedValue(undefined),
  }

  const executeMutation = vi.fn().mockResolvedValue({ versionId: 'ver-1' })

  const service = new ProposalService(store, permissions, audit, executeMutation)

  return { store, permissions, audit, executeMutation, service }
}

const VALID_INPUT = {
  documentId: 'doc-1',
  baseRevision: '2026-08-01T00:00:00.000Z',
  diff: { type: 'replace', path: '/content' },
  proposedContent: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'updated' }] }] },
  rationale: 'Fix typo in the runbook',
  evidenceLocators: ['https://issue-tracker/123'],
  expiresInSeconds: 3600,
}

describe('ProposalService', () => {
  describe('createProposal', () => {
    it('creates a proposal in pending_review state', async () => {
      const { service } = createMocks()
      const result = await service.createProposal('user-1', VALID_INPUT)
      expect(result.status).toBe('pending_review')
      expect(result.proposalId).toBeDefined()
      expect(result.expiresAt).toBeDefined()
    })

    it('does not mutate the document on creation', async () => {
      const { service, executeMutation } = createMocks()
      await service.createProposal('user-1', VALID_INPUT)
      expect(executeMutation).not.toHaveBeenCalled()
    })

    it('records audit event on creation', async () => {
      const { service, audit } = createMocks()
      await service.createProposal('user-1', VALID_INPUT)
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: 'user-1',
          action: 'proposal.create',
          outcome: 'success',
        })
      )
    })

    it('rejects proposal when permission denied', async () => {
      const { service, permissions } = createMocks()
      vi.mocked(permissions.canWrite).mockResolvedValue(false)
      await expect(service.createProposal('user-1', VALID_INPUT)).rejects.toMatchObject({
        status: 403,
        code: 'permission_denied',
      })
    })

    it('rejects proposal for non-existent document', async () => {
      const { service, permissions } = createMocks()
      vi.mocked(permissions.getBaseRevision).mockResolvedValue(null)
      await expect(service.createProposal('user-1', VALID_INPUT)).rejects.toMatchObject({
        status: 404,
        code: 'document_not_found',
      })
    })

    it('returns existing proposal for duplicate idempotency key', async () => {
      const { service } = createMocks()
      const input = { ...VALID_INPUT, idempotencyKey: 'idem-1' }
      const first = await service.createProposal('user-1', input)
      const second = await service.createProposal('user-1', input)
      expect(second.proposalId).toBe(first.proposalId)
    })
  })

  describe('reviewProposal', () => {
    it('approves a pending proposal', async () => {
      const { service } = createMocks()
      const { proposalId } = await service.createProposal('agent-1', VALID_INPUT)
      const result = await service.reviewProposal('reviewer-1', proposalId, {
        decision: 'approve',
        reviewComment: 'LGTM',
      })
      expect(result.status).toBe('approved')
      expect(result.reviewerId).toBe('reviewer-1')
    })

    it('denies a pending proposal', async () => {
      const { service } = createMocks()
      const { proposalId } = await service.createProposal('agent-1', VALID_INPUT)
      const result = await service.reviewProposal('reviewer-1', proposalId, {
        decision: 'deny',
        reviewComment: 'Incorrect change',
      })
      expect(result.status).toBe('denied')
    })

    it('rejects review of non-pending proposal', async () => {
      const { service } = createMocks()
      const { proposalId } = await service.createProposal('agent-1', VALID_INPUT)
      await service.reviewProposal('reviewer-1', proposalId, { decision: 'approve' })
      await expect(
        service.reviewProposal('reviewer-1', proposalId, { decision: 'deny' })
      ).rejects.toMatchObject({ status: 409, code: 'invalid_proposal_state' })
    })

    it('rejects review when permission denied', async () => {
      const { service, permissions } = createMocks()
      const { proposalId } = await service.createProposal('agent-1', VALID_INPUT)
      vi.mocked(permissions.canReview).mockResolvedValue(false)
      await expect(
        service.reviewProposal('stranger', proposalId, { decision: 'approve' })
      ).rejects.toMatchObject({ status: 403, code: 'permission_denied' })
    })

    it('rejects review of expired proposal', async () => {
      const { service } = createMocks()
      const input = { ...VALID_INPUT, expiresInSeconds: 1 }
      const { proposalId } = await service.createProposal('agent-1', input)
      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100))
      await expect(
        service.reviewProposal('reviewer-1', proposalId, { decision: 'approve' })
      ).rejects.toMatchObject({ status: 410, code: 'proposal_expired' })
    })
  })

  describe('commitProposal', () => {
    it('commits an approved proposal and produces a version', async () => {
      const { service, executeMutation } = createMocks()
      const { proposalId } = await service.createProposal('agent-1', VALID_INPUT)
      await service.reviewProposal('reviewer-1', proposalId, { decision: 'approve' })
      const result = await service.commitProposal('agent-1', proposalId)
      expect(result.status).toBe('committed')
      expect(result.operationId).toBeDefined()
      expect(result.versionId).toBe('ver-1')
      expect(executeMutation).toHaveBeenCalledWith(
        'doc-1',
        VALID_INPUT.proposedContent,
        VALID_INPUT.baseRevision,
        expect.any(String)
      )
    })

    it('is idempotent for already-committed proposals', async () => {
      const { service } = createMocks()
      const { proposalId } = await service.createProposal('agent-1', VALID_INPUT)
      await service.reviewProposal('reviewer-1', proposalId, { decision: 'approve' })
      const first = await service.commitProposal('agent-1', proposalId)
      const second = await service.commitProposal('agent-1', proposalId)
      expect(second.operationId).toBe(first.operationId)
    })

    it('rejects commit of denied proposal', async () => {
      const { service } = createMocks()
      const { proposalId } = await service.createProposal('agent-1', VALID_INPUT)
      await service.reviewProposal('reviewer-1', proposalId, { decision: 'deny' })
      await expect(service.commitProposal('agent-1', proposalId)).rejects.toMatchObject({
        status: 409,
        code: 'invalid_proposal_state',
      })
    })

    it('rejects commit when permission revoked', async () => {
      const { service, permissions } = createMocks()
      const { proposalId } = await service.createProposal('agent-1', VALID_INPUT)
      await service.reviewProposal('reviewer-1', proposalId, { decision: 'approve' })
      vi.mocked(permissions.canWrite).mockResolvedValue(false)
      await expect(service.commitProposal('agent-1', proposalId)).rejects.toMatchObject({
        status: 403,
        code: 'permission_revoked',
      })
    })

    it('rejects commit when base revision conflicts', async () => {
      const { service, permissions } = createMocks()
      const { proposalId } = await service.createProposal('agent-1', VALID_INPUT)
      await service.reviewProposal('reviewer-1', proposalId, { decision: 'approve' })
      vi.mocked(permissions.getBaseRevision).mockResolvedValue('2026-08-05T00:00:00.000Z')
      await expect(service.commitProposal('agent-1', proposalId)).rejects.toMatchObject({
        status: 409,
        code: 'base_revision_conflict',
      })
    })

    it('rejects commit of expired proposal', async () => {
      const { service } = createMocks()
      const input = { ...VALID_INPUT, expiresInSeconds: 60 }
      const { proposalId } = await service.createProposal('agent-1', input)
      await service.reviewProposal('reviewer-1', proposalId, { decision: 'approve' })
      // Manually expire by updating store
      const proposal = await service.getProposal('agent-1', proposalId)
      // Hack: override expiresAt in store
      ;(proposal as any).expiresAt = new Date(Date.now() - 1000)
      await expect(service.commitProposal('agent-1', proposalId)).rejects.toMatchObject({
        status: 410,
        code: 'proposal_expired',
      })
    })

    it('records audit correlation across create/review/commit', async () => {
      const { service, audit } = createMocks()
      const { proposalId } = await service.createProposal('agent-1', VALID_INPUT)
      await service.reviewProposal('reviewer-1', proposalId, { decision: 'approve' })
      await service.commitProposal('agent-1', proposalId)
      const calls = vi.mocked(audit.record).mock.calls
      const correlationIds = calls
        .map((call) => call[0].correlationId)
        .filter((id) => id === proposalId)
      // create, approve, commit all share the same correlationId
      expect(correlationIds.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('listProposals', () => {
    it('lists proposals by document', async () => {
      const { service } = createMocks()
      await service.createProposal('agent-1', VALID_INPUT)
      await service.createProposal('agent-1', { ...VALID_INPUT, rationale: 'second change' })
      const list = await service.listProposals('reviewer-1', 'doc-1')
      expect(list).toHaveLength(2)
    })

    it('rejects listing when permission denied', async () => {
      const { service, permissions } = createMocks()
      vi.mocked(permissions.canReview).mockResolvedValue(false)
      await expect(service.listProposals('stranger', 'doc-1')).rejects.toMatchObject({
        status: 403,
      })
    })
  })
})
