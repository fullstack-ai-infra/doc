import { vi } from 'vitest'

vi.mock('next/router', () => require('next-router-mock'))
vi.mock('@/i18n/routing', () => ({
  ...require('next-router-mock'),
  usePathname() {
    return ''
  },
}))
