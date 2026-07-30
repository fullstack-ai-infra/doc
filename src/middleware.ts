import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const handleI18nRouting = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasLocalePrefix = routing.locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  )

  if (!hasLocalePrefix) {
    const savedLocale = request.cookies.get('NEXT_LOCALE')?.value
    const locale = routing.locales.includes(savedLocale as (typeof routing.locales)[number])
      ? savedLocale
      : routing.defaultLocale
    const localizedPath = pathname === '/' ? `/${locale}` : `/${locale}${pathname}`
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const host = forwardedHost || request.headers.get('host') || request.nextUrl.host
    const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
    const protocol =
      forwardedProtocol === 'http' || forwardedProtocol === 'https'
        ? forwardedProtocol
        : request.nextUrl.protocol.replace(':', '')

    // Derive the origin from proxy headers so custom domains remain authoritative.
    return NextResponse.redirect(new URL(`${localizedPath}${search}`, `${protocol}://${host}`))
  }

  return handleI18nRouting(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - auth (authentication routes)
     * - admin (后台路由不走 i18n)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - files with an extension (public assets and metadata files)
     */
    '/((?!api|auth|admin|_next/static|_next/image|.*\\..*).*)',
  ],
}
