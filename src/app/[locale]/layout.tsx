import '../globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { isMobileDevice } from '@/lib/isMobileDevice'
import { Toaster } from '@/components/ui/toaster'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: t('title'),
    description: t('description'),
    icons: {
      icon: '/favicon.svg',
    },
  }
}

export default async function RootLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode
  params: { locale: string }
}>) {
  const isMobile = await isMobileDevice()
  const t = await getTranslations('common')

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          {isMobile && (
            <div className="fixed bottom-0 left-0 w-full text-center text-base py-2 bg-yellow-500">
              <p>{t('notSupportMobile')}</p>
            </div>
          )}
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            {children}
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
