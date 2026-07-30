import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import StartButton from '@/components/start-button'

test('Start button component', async () => {
  render(
    <NextIntlClientProviderWrapper>
      <StartButton />
    </NextIntlClientProviderWrapper>
  )
  const link = screen.getByRole('start-link')
  expect(link.getAttribute('href')).toBe('/work/')

  const button = screen.getByRole('button')
  expect(button.textContent).toBe('Get Started')
})
