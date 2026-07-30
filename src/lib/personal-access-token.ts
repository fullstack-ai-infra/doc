import 'server-only'

import { createHash, randomBytes } from 'node:crypto'
import { PersonalAccessTokenScope as DatabaseScope } from '@prisma/client'
import { db } from '@/db/db'

export const PERSONAL_ACCESS_TOKEN_SCOPES = ['documents:read', 'documents:write'] as const

export type PersonalAccessTokenScope = (typeof PERSONAL_ACCESS_TOKEN_SCOPES)[number]

export type PersonalAccessTokenPrincipal = {
  userId: string
  tokenId: string
  scopes: PersonalAccessTokenScope[]
}

export type PersonalAccessTokenDto = {
  id: string
  name: string
  tokenPrefix: string
  scopes: PersonalAccessTokenScope[]
  expiresAt: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export type CreatePersonalAccessTokenInput = {
  name: string
  scopes: PersonalAccessTokenScope[]
  expiresInDays: number
}

export class PersonalAccessTokenError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'PersonalAccessTokenError'
    this.status = status
    this.code = code
  }
}

const TOKEN_PREFIX = 'doc_pat_'
const TOKEN_SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/
const TOKEN_DISPLAY_LENGTH = 16
const LAST_USED_WRITE_INTERVAL_MS = 15 * 60 * 1000
const MAX_ACTIVE_PERSONAL_ACCESS_TOKENS = 20
const MAX_LISTED_INACTIVE_PERSONAL_ACCESS_TOKENS = 100

const databaseScopeByApiScope: Record<PersonalAccessTokenScope, DatabaseScope> = {
  'documents:read': DatabaseScope.DOCUMENTS_READ,
  'documents:write': DatabaseScope.DOCUMENTS_WRITE,
}

const apiScopeByDatabaseScope: Record<DatabaseScope, PersonalAccessTokenScope> = {
  [DatabaseScope.DOCUMENTS_READ]: 'documents:read',
  [DatabaseScope.DOCUMENTS_WRITE]: 'documents:write',
}

type PersonalAccessTokenRow = {
  id: string
  name: string
  tokenPrefix: string
  scopes: DatabaseScope[]
  expiresAt: Date
  lastUsedAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}

const tokenDtoSelect = {
  id: true,
  name: true,
  tokenPrefix: true,
  scopes: true,
  expiresAt: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
} as const

function toDto(token: PersonalAccessTokenRow): PersonalAccessTokenDto {
  return {
    id: token.id,
    name: token.name,
    tokenPrefix: token.tokenPrefix,
    scopes: token.scopes.map((scope) => apiScopeByDatabaseScope[scope]),
    expiresAt: token.expiresAt.toISOString(),
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
    revokedAt: token.revokedAt?.toISOString() ?? null,
    createdAt: token.createdAt.toISOString(),
  }
}

function validateCreateInput(input: CreatePersonalAccessTokenInput) {
  const name = input.name.trim()
  if (name.length < 1 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new PersonalAccessTokenError(422, 'validation_error', 'Token name must be 1 to 80 printable characters')
  }
  if (!Number.isInteger(input.expiresInDays) || input.expiresInDays < 1 || input.expiresInDays > 365) {
    throw new PersonalAccessTokenError(422, 'validation_error', 'Token expiry must be between 1 and 365 days')
  }
  if (
    input.scopes.length < 1 ||
    new Set(input.scopes).size !== input.scopes.length ||
    input.scopes.some((scope) => !PERSONAL_ACCESS_TOKEN_SCOPES.includes(scope))
  ) {
    throw new PersonalAccessTokenError(422, 'validation_error', 'Token scopes are invalid')
  }
  return {
    name,
    scopes: input.scopes.map((scope) => databaseScopeByApiScope[scope]),
  }
}

export function hashPersonalAccessToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function generatePersonalAccessToken() {
  return `${TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`
}

export async function createPersonalAccessToken(userId: string, input: CreatePersonalAccessTokenInput) {
  const validated = validateCreateInput(input)
  const now = new Date()
  const activeTokenCount = await db.personalAccessToken.count({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
  })
  if (activeTokenCount >= MAX_ACTIVE_PERSONAL_ACCESS_TOKENS) {
    throw new PersonalAccessTokenError(
      429,
      'token_limit_reached',
      `A user can have at most ${MAX_ACTIVE_PERSONAL_ACCESS_TOKENS} active personal access tokens`
    )
  }

  const token = generatePersonalAccessToken()
  const expiresAt = new Date(now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000)
  const created = await db.personalAccessToken.create({
    data: {
      userId,
      name: validated.name,
      tokenHash: hashPersonalAccessToken(token),
      tokenPrefix: token.slice(0, TOKEN_DISPLAY_LENGTH),
      scopes: validated.scopes,
      expiresAt,
    },
    select: tokenDtoSelect,
  })

  return {
    token,
    personalAccessToken: toDto(created),
  }
}

export async function listPersonalAccessTokens(userId: string) {
  const now = new Date()
  const [activeTokens, inactiveTokens] = await Promise.all([
    db.personalAccessToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      select: tokenDtoSelect,
    }),
    db.personalAccessToken.findMany({
      where: {
        userId,
        OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: now } }],
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_LISTED_INACTIVE_PERSONAL_ACCESS_TOKENS,
      select: tokenDtoSelect,
    }),
  ])
  return [...activeTokens, ...inactiveTokens]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .map(toDto)
}

export async function revokePersonalAccessToken(userId: string, tokenId: string) {
  const result = await db.personalAccessToken.updateMany({
    where: {
      id: tokenId,
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  })
  if (result.count > 0) return true

  const existing = await db.personalAccessToken.findFirst({
    where: {
      id: tokenId,
      userId,
    },
    select: { id: true },
  })
  return existing != null
}

export async function authenticatePersonalAccessToken(
  request: Request,
  requiredScope?: PersonalAccessTokenScope
): Promise<PersonalAccessTokenPrincipal> {
  if (requiredScope != null && !PERSONAL_ACCESS_TOKEN_SCOPES.includes(requiredScope)) {
    throw new PersonalAccessTokenError(500, 'invalid_scope_configuration', 'Invalid required token scope')
  }

  const authorization = request.headers.get('authorization')
  const match = authorization?.match(/^Bearer[ \t]+([^,\s]+)$/i)
  const token = match?.[1]
  const secret = token?.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : ''
  if (!token || !TOKEN_SECRET_PATTERN.test(secret)) {
    throw new PersonalAccessTokenError(401, 'invalid_token', 'A valid Bearer token is required')
  }

  const personalAccessToken = await db.personalAccessToken.findUnique({
    where: {
      tokenHash: hashPersonalAccessToken(token),
    },
    select: {
      id: true,
      userId: true,
      scopes: true,
      expiresAt: true,
      lastUsedAt: true,
      revokedAt: true,
    },
  })

  const now = new Date()
  if (
    personalAccessToken == null ||
    personalAccessToken.revokedAt != null ||
    personalAccessToken.expiresAt.getTime() <= now.getTime()
  ) {
    throw new PersonalAccessTokenError(401, 'invalid_token', 'A valid Bearer token is required')
  }

  const scopes = personalAccessToken.scopes.map((scope) => apiScopeByDatabaseScope[scope])
  if (requiredScope != null && !scopes.includes(requiredScope)) {
    throw new PersonalAccessTokenError(403, 'insufficient_scope', `The ${requiredScope} scope is required`)
  }

  if (
    personalAccessToken.lastUsedAt == null ||
    now.getTime() - personalAccessToken.lastUsedAt.getTime() >= LAST_USED_WRITE_INTERVAL_MS
  ) {
    await db.personalAccessToken.updateMany({
      where: {
        id: personalAccessToken.id,
        revokedAt: null,
        expiresAt: { gt: now },
        OR: [{ lastUsedAt: null }, { lastUsedAt: { lte: new Date(now.getTime() - LAST_USED_WRITE_INTERVAL_MS) } }],
      },
      data: {
        lastUsedAt: now,
      },
    })
  }

  return {
    userId: personalAccessToken.userId,
    tokenId: personalAccessToken.id,
    scopes,
  }
}
