'use client'

import { useState, useMemo } from 'react'
import { Copy, CopyCheck, Replace, BetweenHorizonalStart, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslations } from 'next-intl'
import { useEditorStore } from '@/stores/editor-store'
import markdownit from 'markdown-it'
import { EVENT_KEY_INSERT_TO_EDITOR, EVENT_KEY_REPLACE_EDITOR_SEL_CONTENT } from '@/constants'
import emitter from '@/lib/emitter'
import { parseMermaidBlocks } from '../parse-mermaid-blocks'

const md = markdownit()

function escapeHtmlAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderAIContentForEditor(content: string) {
  return parseMermaidBlocks(content)
    .map((segment) => {
      if (segment.type === 'markdown') return md.render(segment.content)
      return `<div data-type="mermaid-block" data-code="${escapeHtmlAttribute(segment.code)}"></div>`
    })
    .join('')
}

interface IProps {
  content: string
  loading: boolean
  reRequestAI?: () => void
}

export default function ItemMenus(props: IProps) {
  const { content, loading, reRequestAI } = props
  const t = useTranslations('AIInput')

  const selectionText = useEditorStore((s) => s.selectionText)
  const isSelectionEmpty = useMemo(() => selectionText === '' || selectionText == null, [selectionText])

  // copy to clipboard
  const [copied, setCopied] = useState(false)
  function onCopy() {
    if (!content) return
    const resultHtml = md.render(content)
    const clipboardItem = new ClipboardItem({
      'text/html': new Blob([resultHtml], { type: 'text/html' }),
      'text/plain': new Blob([content], { type: 'text/plain' }),
    })
    navigator.clipboard.write([clipboardItem])
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  // insert to editor
  function onInsert() {
    if (!content) return
    const resultHtml = renderAIContentForEditor(content)
    emitter.emit(EVENT_KEY_INSERT_TO_EDITOR, resultHtml)
  }

  function onReplace() {
    if (!content) return
    const resultHtml = renderAIContentForEditor(content)
    emitter.emit(EVENT_KEY_REPLACE_EDITOR_SEL_CONTENT, resultHtml)
  }

  return (
    <div className="flex justify-start text-sm text-gray-500 ml-6">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onCopy}
              disabled={loading}
              variant="ghost"
              size="sm"
              className="p-2 h-6 hover:bg-inherit hover:text-blue-400"
              tabIndex={-1}
            >
              {copied ? <CopyCheck className="h-4 w-4 mr-1 text-green-600" /> : <Copy className="h-4 w-4 mr-1" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-secondary-foreground text-secondary text-sm">
            <p>{t('copy')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onInsert}
              disabled={loading}
              variant="ghost"
              size="sm"
              className="p-2 h-6 hover:bg-inherit hover:text-blue-400"
              tabIndex={-1}
            >
              <BetweenHorizonalStart className="h-4 w-4 mr-1" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-secondary-foreground text-secondary text-sm">{t('insert')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onReplace}
              disabled={loading || isSelectionEmpty}
              variant="ghost"
              size="sm"
              className="p-2 h-6 hover:bg-inherit hover:text-blue-400"
              tabIndex={-1}
            >
              <Replace className="h-4 w-4 mr-1" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-secondary-foreground text-secondary text-sm">{t('replace')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={reRequestAI}
              disabled={loading || !reRequestAI}
              variant="ghost"
              size="sm"
              className="p-2 h-6 hover:bg-inherit hover:text-blue-400"
              tabIndex={-1}
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="bg-secondary-foreground text-secondary text-sm">{t('regenerate')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
