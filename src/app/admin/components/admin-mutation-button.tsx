'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { patch } from '@/lib/ajax'

type Props = {
  url: string
  body: Record<string, unknown>
  children: React.ReactNode
  pendingText?: string
  confirmText?: string
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export default function AdminMutationButton({
  url,
  body,
  children,
  pendingText = '处理中...',
  confirmText,
  variant = 'outline',
  size = 'sm',
  className,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (loading) return
    if (confirmText && !window.confirm(confirmText)) return

    setLoading(true)
    try {
      const res = await patch(url, body)
      if (res.errno !== 0) {
        window.alert(res.msg || '操作失败')
        return
      }
      router.refresh()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={handleClick} disabled={loading}>
      {loading ? pendingText : children}
    </Button>
  )
}
