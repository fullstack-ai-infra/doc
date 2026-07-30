/**
 * 原先的代码在 sign-in-button.tsx.bak ，是服务端组件
 * 因为阿里云 函数计算 FC 执行这个代码会报错 502 ，且没有给出详细的报错信息
 * 所以先临时改为当前的代码，使用客户端组件，手动跳转登录页
 */

'use client'

// import { Link } from '@/i18n/routing'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function getHref() {
  if (typeof location === 'undefined') return ''
  return location.href
}

export default function SignInButton({
  children,
  className,
  size,
}: {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'lg' | 'default' | 'icon' | null
}) {
  const href = getHref()
  const url = `/api/auth/signin?callbackUrl=${encodeURIComponent(href)}`

  return (
    <Button className={className} size={size} asChild>
      <Link role="sign-in-link" href={url}>
        {children}
      </Link>
    </Button>
  )
}
