import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NextIntlClientProviderWrapper from '../utils/next-intl-client-provider-wrapper'
import ChangeTheme from '@/components/change-theme'
import { ThemeProvider } from '@/components/theme-provider'

vi.stubGlobal(
  'matchMedia',
  vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
)

test('Change theme component', async () => {
  const theme = 'light'

  render(
    <ThemeProvider attribute="class" defaultTheme={theme}>
      <NextIntlClientProviderWrapper>
        <ChangeTheme />
      </NextIntlClientProviderWrapper>
    </ThemeProvider>
  )
  const button = screen.getByRole('button')
  expect(button.getAttribute('data-title')).toBe(theme)
})
