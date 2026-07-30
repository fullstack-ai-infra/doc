import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ locale: explicitLocale, requestLocale }) => {
  const requestedLocale = explicitLocale || (await requestLocale)

  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(requestedLocale as any)) notFound()

  const locale = requestedLocale as (typeof routing.locales)[number]

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
