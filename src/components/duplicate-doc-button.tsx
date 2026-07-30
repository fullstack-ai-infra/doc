'use client'

import { useRouter } from '@/i18n/routing'
import { useState, useEffect, useCallback } from 'react'
import { Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { useToast } from '@/components/ui/use-toast'
import { post } from '@/lib/ajax'
import { useTranslations } from 'next-intl'

interface IProps {
  id: string
  className?: string
}

export default function DuplicateDocButton(props: IProps) {
  const { id, className = '' } = props
  const { toast } = useToast()
  const router = useRouter()
  const t = useTranslations('docItem')

  const handlerClick = useCallback(async () => {
    const { errno, data, msg } = await post('/api/doc', { originId: id })
    if (errno !== 0) {
      toast({
        variant: 'destructive',
        description: msg || t('duplicateFailed'),
      })
      return
    }
    router.push(`/work/${data.id}`) // 跳转
  }, [id, toast, router, t])

  return (
    <Button variant="ghost" className={cn('w-full justify-start p-2 h-8', className)} onClick={handlerClick}>
      <Copy className="w-4 h-4 mr-1" />
      {t('duplicate')}
    </Button>
  )
}
