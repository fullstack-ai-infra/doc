import { randomUUID } from 'node:crypto'
import { getUserInfo } from '@/lib/session'
import { PersonalAccessTokenError } from '@/lib/personal-access-token'
import { JsonBodyError } from '@/lib/read-json-body'

export class PersonalAccessTokenApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'PersonalAccessTokenApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export async function requireSessionUserId() {
  const user = await getUserInfo()
  if (user?.id == null) {
    throw new PersonalAccessTokenApiError(401, 'unauthorized', 'Authentication required')
  }
  return user.id
}

function allowedRequestOrigins(request: Request) {
  const origins = new Set([new URL(request.url).origin])
  for (const configured of [process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    if (!configured) continue
    try {
      origins.add(new URL(configured).origin)
    } catch {
      // Invalid deployment configuration must not broaden the CSRF allowlist.
    }
  }
  return origins
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  try {
    if (origin == null || !allowedRequestOrigins(request).has(new URL(origin).origin)) {
      throw new PersonalAccessTokenApiError(403, 'origin_not_allowed', 'The request origin is not allowed')
    }
  } catch (error) {
    if (error instanceof PersonalAccessTokenApiError) throw error
    throw new PersonalAccessTokenApiError(403, 'origin_not_allowed', 'The request origin is not allowed')
  }
}

export function errorResponse(error: unknown) {
  const requestId = randomUUID()
  const knownError =
    error instanceof PersonalAccessTokenApiError ||
    error instanceof PersonalAccessTokenError ||
    error instanceof JsonBodyError
      ? error
      : null
  if (knownError == null) {
    console.error('Personal access token API error', { requestId, error })
  }
  const status = knownError?.status ?? 500
  const body = {
    error: {
      code: knownError?.code ?? 'internal_error',
      message: knownError?.message ?? 'An unexpected error occurred',
      ...(knownError instanceof PersonalAccessTokenApiError && knownError.details != null
        ? { details: knownError.details }
        : {}),
    },
    requestId,
  }
  return Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-request-id': requestId,
    },
  })
}

export function noStoreJson(data: unknown, status = 200) {
  return Response.json(
    { data },
    {
      status,
      headers: {
        'cache-control': 'no-store',
      },
    }
  )
}
