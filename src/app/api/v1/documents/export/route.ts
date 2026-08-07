import { authenticatePersonalAccessToken } from '@/lib/personal-access-token'
import { apiError, apiRequestId, apiSuccess } from '@/lib/api-v1'
import { exportDocumentBundle } from '@/lib/api-v1-bundle'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requestId = apiRequestId(request)
  try {
    const principal = await authenticatePersonalAccessToken(request, 'documents:read')
    const bundle = await exportDocumentBundle(principal.userId)
    return apiSuccess(bundle, {
      requestId,
      headers: {
        'Content-Disposition': `attachment; filename="${bundle.bundleId}.docbundle.json"`,
      },
    })
  } catch (error) {
    return apiError(error, requestId)
  }
}
