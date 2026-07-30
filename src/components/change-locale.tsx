'use client'

import { useTransition } from 'react'
import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from 'next-intl'
import { Locale, usePathname, useRouter } from '@/i18n/routing'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export default function ChangeLocale() {
  const curLocale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const pathname = usePathname()

  function onSelectChange(nextLocale: Locale) {
    if (curLocale === nextLocale) return
    if (isPending) return
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale })
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-title={curLocale}>
          <Languages className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onSelectChange('en')}>🇺🇸 English</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelectChange('zh-cn')}>🇨🇳 中文</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
