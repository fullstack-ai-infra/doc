import { useState, useEffect, useMemo } from 'react'
import { AI_CONTEXT_MAX_LENGTH } from '@/constants'
import { useDocsStore } from '@/stores/docs-store'
import { useTranslations } from 'next-intl'
import { useEditorStore } from '@/stores/editor-store'

export interface IMessage {
  role: 'user' | 'system' | 'assistant'
  content: string
}

export type MessagesType = IMessage[]

export function useGenSystemMessage(): IMessage {
  const t = useTranslations('AIInput')
  const [message, setMessage] = useState<IMessage>({ role: 'system', content: t('writingArticle') })

  // get doc title
  const docs = useDocsStore((s) => s.docs)
  const id = useDocsStore((s) => s.curDocId)
  const curDoc = useMemo(() => docs.find((d) => d.id === id), [docs, id])
  const { title = '' } = curDoc || {}

  useEffect(() => {
    if (title) {
      setMessage({ role: 'system', content: t('writingArticle') + ', ' + t('titleTip', { title }) })
    }
  }, [t, title])

  return message
}

export function useGenSelectedContentMessages(): MessagesType {
  const t = useTranslations('AIInput')
  const [messages, setMessages] = useState<MessagesType>([])

  const selectionText = useEditorStore((s) => s.selectionText)

  useEffect(() => {
    let txt = selectionText
    if (txt === '') return
    if (txt.length > AI_CONTEXT_MAX_LENGTH) {
      txt = txt.slice(0, AI_CONTEXT_MAX_LENGTH) + '...' // 截断
    }
    setMessages([])
    setMessages((arr) => arr.concat({ role: 'user', content: t('contentWillHandle') }))
    setMessages((arr) => arr.concat({ role: 'assistant', content: txt }))
  }, [selectionText, t])

  return messages
}
