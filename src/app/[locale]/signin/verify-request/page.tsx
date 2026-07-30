import HomeNav from '@/components/home-nav'
import { useTranslations } from 'next-intl'

export default function VerifyRequestPage() {
  const t = useTranslations('verifyRequest')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      <HomeNav />
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-secondary-foreground">{t('title')}</h1>
          <p className="text-gray-500">{t('subTitle')}</p>
        </div>
      </div>
    </div>
  )
}
