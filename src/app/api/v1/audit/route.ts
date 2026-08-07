import { authenticatePersonalAccessToken } from '@/lib/personal-access-token'
import { apiError, apiRequestId, apiSuccess } from '@/lib/api-v1'
import { queryAuditEvents } from '@/lib/audit-trail'
import { db } from '@/db/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const requestId = apiRequestId(request)
  try {
    const principal = await authenticatePersonalAccessToken(request, 'documents:read')

    // Check if user is admin
    const user = await db.user.findFirst({
      where: { id: principal.userId },
      select: { isAdmin: true },
    })
    if (!user) {
      return apiError(new Error('User not found'), requestId)
    }

    const url = new URL(request.url)
    const params = {
      target: url.searchParams.get('target') || undefined,
      actor: url.searchParams.get('actor') || undefined,
      action: url.searchParams.get('action') || undefined,
      startTime: url.searchParams.get('start_time') || undefined,
      endTime: url.searchParams.get('end_time') || undefined,
      cursor: url.searchParams.get('cursor') || undefined,
      limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
    }

    const result = await queryAuditEvents(principal.userId, user.isAdmin, params)

    return apiSuccess(result.events, {
      requestId,
      meta: { nextCursor: result.nextCursor },
    })
  } catch (error) {
    return apiError(error, requestId)
  }
}
