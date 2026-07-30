import { expect, test, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import SignoutButton from '@/components/sign-out-button'
import mockAPI from '../utils/mock-api'

mockAPI()

vi.stubGlobal('confirm', () => true)

test('Signout button component', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <SignoutButton>Signout</SignoutButton>
    </NextIntlClientProviderWrapper>
  )
  const button = screen.getByRole('button')
  expect(button).toBeDefined()
  expect(button.getAttribute('disabled')).toBeNull()

  fireEvent.click(button)
  // await waitFor(() => {
  //   expect(button.getAttribute('disabled')).not.toBeNull()
  // })
})
