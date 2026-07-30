'use client'

import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { useDocVersionStore } from '@/stores/doc-version-store'

// 渲染版本记录入口按钮，并在点击时打开版本中心弹窗。
export default function VersionEntryButton(props: { onEntryClick?: () => void }) {
  const { onEntryClick } = props
  const t = useTranslations('docVersion')
  const setOpen = useDocVersionStore((s) => s.setOpen)

  function handleClick() {
    onEntryClick?.()
    setOpen(true)
  }

  return (
    <Button variant="ghost" className="w-full justify-start p-2 h-8" aria-label={t('entry')} onClick={handleClick}>
      <History className="size-4 shrink-0 mr-1" />
      {t('entry')}
    </Button>
  )
}
