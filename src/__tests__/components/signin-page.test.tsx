import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SignInPage from '@/app/[locale]/signin/page'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'

const authMocks = vi.hoisted(() => ({
  getProviders: vi.fn(),
  signIn: vi.fn(),
}))

vi.mock('next-auth/react', () => authMocks)

const emailProvider = {
  id: 'nodemailer',
  name: 'Nodemailer',
  type: 'email',
  signinUrl: '/api/auth/signin/nodemailer',
  callbackUrl: '/api/auth/callback/nodemailer',
}

const resendProvider = {
  ...emailProvider,
  id: 'resend',
  name: 'Resend',
  signinUrl: '/api/auth/signin/resend',
  callbackUrl: '/api/auth/callback/resend',
}

function renderPage() {
  return render(
    <NextIntlClientProviderWrapper>
      <SignInPage />
    </NextIntlClientProviderWrapper>
  )
}

describe('sign-in provider selection', () => {
  afterEach(cleanup)

  beforeEach(() => {
    authMocks.getProviders.mockReset()
    authMocks.signIn.mockReset()
  })

  it('shows only providers exposed by Auth.js', async () => {
    authMocks.getProviders.mockResolvedValue({ nodemailer: emailProvider })
    renderPage()

    expect(await screen.findByRole('button', { name: 'Continue with Email' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Continue with Github' })).toBeNull()
  })

  it('prefers Resend when both email providers are available', async () => {
    authMocks.getProviders.mockResolvedValue({ nodemailer: emailProvider, resend: resendProvider })
    renderPage()

    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'owner@example.test' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Continue with Email' }).closest('form')!)

    await waitFor(() => {
      expect(authMocks.signIn).toHaveBeenCalledWith('resend', {
        email: 'owner@example.test',
        callbackUrl: '/',
      })
    })
  })

  it('shows an operator-facing error when no provider is configured', async () => {
    authMocks.getProviders.mockResolvedValue({})
    renderPage()

    expect((await screen.findByRole('alert')).textContent).toContain('No sign-in method is configured')
    expect(screen.queryByRole('button', { name: 'Continue with Email' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Continue with Github' })).toBeNull()
  })
})
