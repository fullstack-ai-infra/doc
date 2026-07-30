import { randomUUID } from 'node:crypto'
import { JsonBodyError, readJsonBody } from '@/lib/read-json-body'

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/

export class ApiV1Error extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiV1Error'
    this.status = status
    this.code = code
  }
}

export function apiRequestId(request: Request) {
  const provided = request.headers.get('x-request-id') || ''
  return REQUEST_ID_PATTERN.test(provided) ? provided : randomUUID()
}

export function apiSuccess(
  data: unknown,
  options: {
    status?: number
    requestId: string
    meta?: unknown
    headers?: HeadersInit
  }
) {
  const headers = new Headers(options.headers)
  headers.set('Cache-Control', 'private, no-store')
  headers.set('X-Request-Id', options.requestId)

  return Response.json(
    {
      data,
      ...(options.meta === undefined ? {} : { meta: options.meta }),
      requestId: options.requestId,
    },
    {
      status: options.status || 200,
      headers,
    }
  )
}

function normalizeApiError(error: unknown) {
  if (
    error instanceof ApiV1Error ||
    (error instanceof Error &&
      typeof (error as Error & { status?: unknown }).status === 'number' &&
      typeof (error as Error & { code?: unknown }).code === 'string')
  ) {
    const typed = error as Error & { status: number; code: string }
    return {
      status: typed.status,
      code: typed.code,
      message: typed.message,
      known: true,
    }
  }

  return {
    status: 500,
    code: 'internal_error',
    message: 'The request could not be completed',
    known: false,
  }
}

export function apiError(error: unknown, requestId: string) {
  const normalized = normalizeApiError(error)
  if (!normalized.known) {
    console.error(`[api-v1:${requestId}] request failed`, error)
  }

  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'X-Request-Id': requestId,
  })
  if (normalized.status === 401) {
    headers.set('WWW-Authenticate', 'Bearer realm="doc", error="invalid_token"')
  }

  return Response.json(
    {
      error: {
        code: normalized.code,
        message: normalized.message,
      },
      requestId,
    },
    {
      status: normalized.status,
      headers,
    }
  )
}

export async function readApiJson(request: Request, maximumBytes = 1024 * 1024) {
  try {
    return await readJsonBody(request, maximumBytes)
  } catch (error) {
    if (error instanceof JsonBodyError) {
      throw new ApiV1Error(error.status, error.code, error.message)
    }
    throw error
  }
}
