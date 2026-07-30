'use client'

import MermaidRenderer from '@/components/mermaid-renderer'
import { Button } from '@/components/ui/button'
import emitter from '@/lib/emitter'
import { EVENT_KEY_INSERT_TO_EDITOR } from '@/constants'
import { BetweenHorizonalStart } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface MermaidPreviewCardProps {
  code: string
}

export default function MermaidPreviewCard(props: MermaidPreviewCardProps) {
  const { code } = props
  const t = useTranslations('editor')

  function insertToEditor() {
    emitter.emit(EVENT_KEY_INSERT_TO_EDITOR, {
      type: 'mermaidBlock',
      attrs: {
        code,
      },
    })
  }

  return (
    <div className="my-3 overflow-hidden rounded border bg-background">
      <div className="flex items-center justify-between border-b px-2 py-1 text-xs text-muted-foreground">
        <span>{t('mermaidDiagram')}</span>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={insertToEditor} disabled={!code.trim()}>
          <BetweenHorizonalStart className="mr-1 h-3.5 w-3.5" />
          {t('mermaidInsertToDoc')}
        </Button>
      </div>
      <div className="overflow-auto bg-white p-3 dark:bg-gray-950">
        <MermaidRenderer code={code} className="flex min-h-32 items-center justify-center [&_svg]:max-w-full" />
      </div>
    </div>
  )
}
