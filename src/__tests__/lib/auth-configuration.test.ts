import { describe, expect, it } from 'vitest'
import { resolveAuthConfiguration } from '@/lib/auth-configuration'

describe('authentication provider configuration', () => {
  it('does not expose providers with partial configuration', () => {
    expect(resolveAuthConfiguration({ AUTH_GITHUB_ID: 'github-id' }).providerIds).toEqual([])
    expect(
      resolveAuthConfiguration({
        EMAIL_FROM: 'doc@example.test',
        EMAIL_HOST: '127.0.0.1',
      }).providerIds
    ).toEqual([])
  })

  it('enables zero-credential local SMTP without inventing SMTP authentication', () => {
    const configuration = resolveAuthConfiguration({
      EMAIL_FROM: 'doc@example.test',
      EMAIL_HOST: '127.0.0.1',
      EMAIL_PORT: '1025',
      EMAIL_SECURE: 'false',
    })

    expect(configuration.providerIds).toEqual(['nodemailer'])
    expect(configuration.smtp).toEqual({
      from: 'doc@example.test',
      server: {
        host: '127.0.0.1',
        port: 1025,
        secure: false,
      },
    })
  })

  it('preserves complete GitHub, authenticated SMTP, and Resend providers', () => {
    const configuration = resolveAuthConfiguration({
      AUTH_GITHUB_ID: 'github-id',
      AUTH_GITHUB_SECRET: 'github-secret',
      EMAIL_FROM: 'doc@example.com',
      EMAIL_HOST: 'smtp.example.com',
      EMAIL_PORT: '465',
      EMAIL_USERNAME: 'mailer',
      EMAIL_PASSWORD: 'smtp-secret',
      RESEND_API_KEY: 'resend-secret',
    })

    expect(configuration.providerIds).toEqual(['github', 'nodemailer', 'resend'])
    expect(configuration.smtp?.server).toMatchObject({
      secure: true,
      auth: { user: 'mailer', pass: 'smtp-secret' },
    })
  })
})
