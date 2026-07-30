import { authenticatePersonalAccessToken } from '@/lib/personal-access-token'
import { apiError, apiRequestId, apiSuccess } from '@/lib/api-v1'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requestId = apiRequestId(request)
  try {
    const principal = await authenticatePersonalAccessToken(request)
    return apiSuccess(
      {
        authenticated: true,
        userId: principal.userId,
        scopes: principal.scopes,
      },
      { requestId }
    )
  } catch (error) {
    return apiError(error, requestId)
  }
}
