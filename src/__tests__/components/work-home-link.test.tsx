import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import HomeLink from '@/components/work-home-link'

test('Home link component', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <HomeLink />
    </NextIntlClientProviderWrapper>
  )
  expect(screen.getByRole('button').textContent).toBe('My Home')
})
