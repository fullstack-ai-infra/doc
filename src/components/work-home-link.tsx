'use client'

import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { nav } from '@/app/[locale]/work/[id]/@directory/util'

export default function HomeLink() {
  const t = useTranslations('contentHome')

  function handleClick() {
    nav('0')
  }

  return (
    <Button className="w-full justify-start px-2 h-9" variant="ghost" onClick={handleClick}>
      <Home className="h-4 w-4 mr-1" />
      {t('title')}
    </Button>
  )
}
