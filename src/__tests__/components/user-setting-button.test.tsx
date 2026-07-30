import { expect, test } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import UserSettingButton from '@/components/user-setting-button'

test('User setting button component', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <UserSettingButton />
    </NextIntlClientProviderWrapper>
  )
  const button = screen.getByRole('button')
  expect(button).toBeDefined()
  expect(button.textContent).toBe('User / Setting')

  // click, show dialog
  fireEvent.click(button)
  expect(screen.getByRole('user-setting-content')).toBeDefined()
})
