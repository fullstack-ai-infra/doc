import { authenticatePersonalAccessToken } from '@/lib/personal-access-token'
import { apiError, apiRequestId, apiSuccess, readApiJson } from '@/lib/api-v1'
import { importDocumentBundle } from '@/lib/api-v1-bundle'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BUNDLE_BYTES = 32 * 1024 * 1024

export async function POST(request: Request) {
  const requestId = apiRequestId(request)
  try {
    const principal = await authenticatePersonalAccessToken(request, 'documents:write')
    const bundle = await readApiJson(request, MAX_BUNDLE_BYTES)
    const result = await importDocumentBundle(principal.userId, bundle)
    return apiSuccess(result, { status: 201, requestId })
  } catch (error) {
    return apiError(error, requestId)
  }
}
