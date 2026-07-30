import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'zh-cn'],

  // Used when no locale matches
  defaultLocale: 'zh-cn',

  // Keep every locale explicit. This avoids the default locale being rewritten
  // internally and then canonicalized back to the same public URL.
  localePrefix: 'always',
})

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)

export type Locale = (typeof routing.locales)[number]
