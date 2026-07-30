'use client'

import { useState, useEffect } from 'react'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LAST_DOC_ID_KEY } from '@/constants'
import { useTranslations } from 'next-intl'

export default function StartButton(props: { className?: string; size?: 'sm' | 'lg' | 'default' | 'icon' | null }) {
  const { className, size } = props
  const [lastDocId, setLastDocId] = useState('')
  useEffect(() => {
    const lastDocId = localStorage.getItem(LAST_DOC_ID_KEY)
    if (lastDocId) {
      setLastDocId(lastDocId)
    }
  }, [])

  const homeTrans = useTranslations('home')

  return (
    <a role="start-link" href={lastDocId ? `/work/${lastDocId}` : '/work/'}>
      <Button className={className} size={size}>
        <Zap className="h-4 w-4 mr-1" />
        {homeTrans('getStarted')}
      </Button>
    </a>
  )
}
