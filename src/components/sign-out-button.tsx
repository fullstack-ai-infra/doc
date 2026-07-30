'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { post } from '@/lib/ajax'
import { useTranslations } from 'next-intl'

export default function SignOutButton({
  children,
  className,
  size,
  variant,
}: {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'lg'
  variant?: 'secondary' | 'ghost' | 'link' | 'default' | 'destructive' | 'outline' | null
}) {
  const t = useTranslations('userInfo')
  const [disabled, setDisabled] = useState(false)

  async function onClick() {
    const text = t('logoutConfirm')
    const c = confirm(text)
    if (!c) return

    try {
      await post('/api/user/sign-out', {})
      setDisabled(true)
    } catch (e) {}
    console.log('sign out')
    location.href = '/'
  }
  return (
    <div className="w-full">
      <Button className={className} size={size} variant={variant} onClick={onClick} disabled={disabled}>
        {children}
      </Button>
    </div>
  )
}
