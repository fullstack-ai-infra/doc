import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import Logo from '@/components/logo-component'

test('Logo component', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <Logo />
    </NextIntlClientProviderWrapper>
  )
  const link = screen.getByRole('logo')
  expect(link.getAttribute('href')).toBe('/')
})
