function configuredValue(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function validPort(value) {
  if (!/^\d+$/.test(value || '')) return false
  const port = Number(value)
  return port >= 1 && port <= 65535
}

function validSecureMode(value) {
  return !configuredValue(value) || ['true', 'false', '1', '0'].includes(value.trim().toLowerCase())
}

export function resolveAuthConfiguration(env = {}) {
  const emailFrom = env.EMAIL_FROM?.trim() || ''
  const emailUsername = (env.EMAIL_USERNAME || env.EMAIL_USER || '').trim()
  const emailPassword = env.EMAIL_PASSWORD || ''
  const fallbackUsername = emailFrom.includes('@') ? emailFrom.split('@', 1)[0] : ''
  const smtpUsername = emailUsername || (configuredValue(emailPassword) ? fallbackUsername : '')
  const smtpAuthComplete =
    (!configuredValue(emailUsername) && !configuredValue(emailPassword)) ||
    (configuredValue(smtpUsername) && configuredValue(emailPassword))

  const github = configuredValue(env.AUTH_GITHUB_ID) && configuredValue(env.AUTH_GITHUB_SECRET)
  const smtp =
    configuredValue(emailFrom) &&
    configuredValue(env.EMAIL_HOST) &&
    validPort(env.EMAIL_PORT) &&
    validSecureMode(env.EMAIL_SECURE) &&
    smtpAuthComplete
  const resend = configuredValue(emailFrom) && configuredValue(env.RESEND_API_KEY)

  return {
    github,
    smtp,
    resend,
    providerIds: [github ? 'github' : null, smtp ? 'nodemailer' : null, resend ? 'resend' : null].filter(Boolean),
  }
}

export function hasUsableAuthPath(env = {}) {
  return resolveAuthConfiguration(env).providerIds.length > 0
}
