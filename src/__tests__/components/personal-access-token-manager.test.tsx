import { expect, test } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import PersonalAccessTokenManager from '@/components/personal-access-token-manager'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import mockAPI from '../utils/mock-api'

mockAPI()

test('creates a token, shows the raw value once, and dismisses it', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <PersonalAccessTokenManager />
    </NextIntlClientProviderWrapper>
  )

  expect(await screen.findByText('No personal access tokens yet.')).toBeDefined()
  fireEvent.change(screen.getByLabelText('Token name'), {
    target: { value: 'Development laptop' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Create token' }))

  const rawToken = await screen.findByLabelText('Personal access token')
  expect(rawToken.getAttribute('value')).toMatch(/^doc_pat_[A-Za-z0-9_-]{43}$/)
  expect(screen.getByText('Development laptop')).toBeDefined()

  fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
  await waitFor(() => {
    expect(screen.queryByLabelText('Personal access token')).toBeNull()
  })
})
