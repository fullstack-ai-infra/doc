import { z } from 'zod'
import {
  createPersonalAccessToken,
  listPersonalAccessTokens,
  PERSONAL_ACCESS_TOKEN_SCOPES,
} from '@/lib/personal-access-token'
import {
  errorResponse,
  noStoreJson,
  PersonalAccessTokenApiError,
  requireSameOrigin,
  requireSessionUserId,
} from './_shared'
import { readJsonBody } from '@/lib/read-json-body'

export const dynamic = 'force-dynamic'

const createPersonalAccessTokenSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Control characters are not allowed'),
    scopes: z
      .array(z.enum(PERSONAL_ACCESS_TOKEN_SCOPES))
      .min(1)
      .max(PERSONAL_ACCESS_TOKEN_SCOPES.length)
      .refine((scopes) => new Set(scopes).size === scopes.length, 'Scopes must be unique'),
    expiresInDays: z.number().int().min(1).max(365),
  })
  .strict()

export async function GET() {
  try {
    const userId = await requireSessionUserId()
    return noStoreJson(await listPersonalAccessTokens(userId))
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId()
    requireSameOrigin(request)

    const body = await readJsonBody(request, 16 * 1024)
    const parsed = createPersonalAccessTokenSchema.safeParse(body)
    if (!parsed.success) {
      throw new PersonalAccessTokenApiError(
        422,
        'validation_error',
        'Personal access token input is invalid',
        parsed.error.issues.map(({ code, message, path }) => ({ code, message, path }))
      )
    }

    const result = await createPersonalAccessToken(userId, parsed.data)
    return noStoreJson(
      {
        ...result.personalAccessToken,
        token: result.token,
      },
      201
    )
  } catch (error) {
    return errorResponse(error)
  }
}
