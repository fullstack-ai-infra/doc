import { authenticatePersonalAccessToken } from '@/lib/personal-access-token'
import { apiError, apiRequestId, apiSuccess, readApiJson } from '@/lib/api-v1'
import { mutateDocumentContent, parseMutateContent } from '@/lib/api-v1-mutations'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = apiRequestId(request)
  try {
    const principal = await authenticatePersonalAccessToken(request, 'documents:write')
    const { id } = await params
    const body = await readApiJson(request)
    const input = parseMutateContent(body)

    const result = await mutateDocumentContent(principal.userId, id, input)

    return apiSuccess(result, {
      status: 200,
      requestId,
      headers: { ETag: result.etag },
    })
  } catch (error) {
    return apiError(error, requestId)
  }
}
