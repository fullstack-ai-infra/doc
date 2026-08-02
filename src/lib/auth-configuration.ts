export type AuthEnvironment = Record<string, string | undefined>

type SmtpServerConfiguration = {
  host: string
  port: number
  secure: boolean
  auth?: {
    user: string
    pass: string
  }
}

export type ResolvedAuthConfiguration = {
  github?: {
    clientId: string
    clientSecret: string
  }
  smtp?: {
    server: SmtpServerConfiguration
    from: string
  }
  resend?: {
    apiKey: string
    from: string
  }
  providerIds: Array<'github' | 'nodemailer' | 'resend'>
}

function configuredValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

function parsePort(value: string | undefined) {
  if (!/^\d+$/.test(value || '')) return null
  const port = Number(value)
  return port >= 1 && port <= 65535 ? port : null
}

function parseSecure(value: string | undefined, port: number) {
  if (!configuredValue(value)) return port === 465
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1') return true
  if (normalized === 'false' || normalized === '0') return false
  return null
}

export function resolveAuthConfiguration(env: AuthEnvironment = process.env): ResolvedAuthConfiguration {
  const result: ResolvedAuthConfiguration = { providerIds: [] }

  if (configuredValue(env.AUTH_GITHUB_ID) && configuredValue(env.AUTH_GITHUB_SECRET)) {
    result.github = {
      clientId: env.AUTH_GITHUB_ID.trim(),
      clientSecret: env.AUTH_GITHUB_SECRET.trim(),
    }
    result.providerIds.push('github')
  }

  const from = env.EMAIL_FROM?.trim() || ''
  const host = env.EMAIL_HOST?.trim() || ''
  const port = parsePort(env.EMAIL_PORT)
  const secure = port === null ? null : parseSecure(env.EMAIL_SECURE, port)
  const explicitUsername = (env.EMAIL_USERNAME || env.EMAIL_USER || '').trim()
  const password = env.EMAIL_PASSWORD || ''
  const fallbackUsername = from.includes('@') ? from.split('@', 1)[0] : ''
  const username = explicitUsername || (configuredValue(password) ? fallbackUsername : '')
  const hasAuthValues = configuredValue(explicitUsername) || configuredValue(password)
  const authComplete = !hasAuthValues || (configuredValue(username) && configuredValue(password))

  if (configuredValue(from) && configuredValue(host) && port !== null && secure !== null && authComplete) {
    result.smtp = {
      from,
      server: {
        host,
        port,
        secure,
        ...(hasAuthValues ? { auth: { user: username, pass: password } } : {}),
      },
    }
    result.providerIds.push('nodemailer')
  }

  if (configuredValue(from) && configuredValue(env.RESEND_API_KEY)) {
    result.resend = {
      apiKey: env.RESEND_API_KEY.trim(),
      from,
    }
    result.providerIds.push('resend')
  }

  return result
}
