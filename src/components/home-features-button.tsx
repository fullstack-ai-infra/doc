'use client'

import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

export default function HomeFeaturesButton() {
  const t = useTranslations('home')

  return (
    <Button
      variant="ghost"
      className="text-gray-700 dark:text-gray-300"
      onClick={() => {
        document.getElementById('features-showcase')?.scrollIntoView({
          behavior: 'smooth',
        })
      }}
    >
      {t('features')}
    </Button>
  )
}
