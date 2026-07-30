import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import ChangeLocale from '@/components/change-locale'

test('Change locale component', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <ChangeLocale />
    </NextIntlClientProviderWrapper>
  )
  const button = screen.getByRole('button')
  expect(button.getAttribute('data-title')).toBe('en')
})
