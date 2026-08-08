import { authenticatePersonalAccessToken } from '@/lib/personal-access-token'
import { apiError, apiRequestId, apiSuccess, readApiJson } from '@/lib/api-v1'
import { createProposalSchema } from '@/lib/api-v1-proposals'
import { getProposalService } from '@/lib/api-v1-proposals-instance'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const requestId = apiRequestId(request)
  try {
    const principal = await authenticatePersonalAccessToken(request, 'documents:write')
    const body = await readApiJson(request)
    const input = createProposalSchema.parse(body)
    const service = getProposalService()
    const result = await service.createProposal(principal.userId, input)
    return apiSuccess(result, { status: 201, requestId })
  } catch (error) {
    return apiError(error, requestId)
  }
}

export async function GET(request: Request) {
  const requestId = apiRequestId(request)
  try {
    const principal = await authenticatePersonalAccessToken(request, 'documents:read')
    const url = new URL(request.url)
    const documentId = url.searchParams.get('documentId')
    if (!documentId) {
      return apiError({ status: 400, code: 'missing_parameter', message: 'documentId is required' }, requestId)
    }
    const status = url.searchParams.get('status') as any
    const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 100)
    const offset = Number(url.searchParams.get('offset') || '0')
    const service = getProposalService()
    const proposals = await service.listProposals(principal.userId, documentId, {
      status: status || undefined,
      limit,
      offset,
    })
    return apiSuccess(proposals, { requestId })
  } catch (error) {
    return apiError(error, requestId)
  }
}
