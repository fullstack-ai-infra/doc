'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDialogStore } from '@/stores/dialog-store'
import { useTranslations } from 'next-intl'

export default function AIPanelButton() {
  const AIPanelOpen = useDialogStore((s) => s.AIPanelOpen)
  const setAIPanelOpen = useDialogStore((s) => s.setAIPanelOpen)
  const t = useTranslations('AIInput')
  return (
    <Button variant={AIPanelOpen ? 'secondary' : 'ghost'} size="sm" onClick={() => setAIPanelOpen(!AIPanelOpen)}>
      <Sparkles className="h-4 w-4 mr-1" />
      {t('AIWriting')}
    </Button>
  )
}
