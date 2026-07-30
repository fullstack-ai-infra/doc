import { Link, redirect } from '@/i18n/routing'
import { getUserInfo } from '@/lib/session'
import { isMobileDevice } from '@/lib/isMobileDevice'
import { getLocale, getTranslations } from 'next-intl/server'

export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isMobile = await isMobileDevice()
  const locale = await getLocale()
  const t = await getTranslations('common')

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <p>
          <Link href="/" className="font-bold underline">
            {t('brandName')}
          </Link>
          , {t('notSupportMobile')}
        </p>
      </div>
    )
  }

  const user = await getUserInfo()
  if (user == null) {
    redirect({ href: '/user-info', locale })
    return null
  }

  return <>{children}</>
}
