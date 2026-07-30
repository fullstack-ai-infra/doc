'use client'

import { useMemo } from 'react'
import { useDocsStore } from '@/stores/docs-store'
import AITokenInfo from '@/components/ai-token-info'
import { useTranslations, useLocale } from 'next-intl'

export default function BottomBar() {
  const t = useTranslations('docItem')
  const locale = useLocale()

  const docs = useDocsStore((s) => s.docs)
  const id = useDocsStore((s) => s.curDocId)
  const doc = useMemo(() => docs.find((d) => d.id === id), [docs, id])

  return (
    <div className="border-t flex items-center justify-between px-3 py-1 text-sm text-muted-foreground">
      <div>
        <span>
          {t('createdAt')} {doc?.createdAt?.toLocaleDateString(locale)}, {doc?.createdAt?.toLocaleTimeString(locale)}
        </span>
        <span> , </span>
        <span>
          {t('updatedAt')} {doc?.updatedAt?.toLocaleDateString(locale)} {doc?.updatedAt?.toLocaleTimeString(locale)}
        </span>
      </div>
      <div className="text-sm text-gray-400">
        <AITokenInfo />
      </div>
    </div>
  )
}
