import { expect, test } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import { UserProfileForm } from '@/components/user-profile-form'
import mockAPI from '../utils/mock-api'

mockAPI()

test('User profile form component', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <UserProfileForm email="xx@xx.com" name="xx" avatar="" />
    </NextIntlClientProviderWrapper>
  )

  expect(screen.getByRole('user-profile-form')).toBeDefined()
  expect(screen.getByRole('email-input')).toBeDefined()
  expect(screen.getByRole('name-input')).toBeDefined()
  expect(screen.getByRole('avatar-input')).toBeDefined()

  const submitButton = screen.getByRole('submit-button')
  expect(submitButton).toBeDefined()
  expect(submitButton.getAttribute('disabled')).toBeNull()

  // click submit button
  fireEvent.click(submitButton)
  await waitFor(() => {
    expect(submitButton.getAttribute('disabled')).not.toBeNull()
  })
})
