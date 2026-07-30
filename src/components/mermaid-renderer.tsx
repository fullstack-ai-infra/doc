'use client'

import { useEffect, useId, useState } from 'react'
import mermaid from 'mermaid'
import { useTranslations } from 'next-intl'

interface MermaidRendererProps {
  code: string
  className?: string
}

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'default',
})

export default function MermaidRenderer(props: MermaidRendererProps) {
  const { code, className } = props
  const t = useTranslations('editor')
  const reactId = useId()
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const source = code.trim()
      if (!source) {
        setSvg('')
        setError('')
        return
      }

      try {
        const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now()}`
        const result = await mermaid.render(id, source)
        setSvg(result.svg)
        setError('')
      } catch (err) {
        setSvg('')
        setError(err instanceof Error ? err.message : t('mermaidRenderFailed'))
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [code, reactId, t])

  if (error) {
    return (
      <div className={className}>
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <p className="font-medium">{t('mermaidRenderFailedTip')}</p>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{error}</pre>
        </div>
      </div>
    )
  }

  if (!svg) {
    return <div className={className} />
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />
}
