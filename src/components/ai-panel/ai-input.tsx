'use client'

import { useState, forwardRef, ForwardedRef } from 'react'
import { CornerDownLeft, LoaderCircle, CircleStop } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import emitter from '@/lib/emitter'
import { EVENT_KEY_FOCUS_EDITOR, AI_CONTEXT_MAX_LENGTH, AI_PANEL_HISTORY_TURNS } from '@/constants'
import { MessagesType, useGenSystemMessage } from './hooks/useGenMessages'
import { useTranslations } from 'next-intl'
import { useEditorStore } from '@/stores/editor-store'
import { buildHistoryMessages } from './util'

interface IProps {
  isFocus: boolean
  loading: boolean
  onRequestAI: (message: MessagesType) => void
  onAbortRequestAI: () => void
  instruction: string
  setInstruction: (instruction: string) => void
  delay: number
  chatList?: Array<{ from: 'user' | 'AI'; content: string }>
}

const AIInput = forwardRef((props: IProps, inputRef: ForwardedRef<HTMLTextAreaElement>) => {
  const t = useTranslations('AIInput')

  const { onRequestAI, onAbortRequestAI, setInstruction, isFocus, loading, instruction, delay, chatList } = props
  const systemMessage = useGenSystemMessage()
  const selectionText = useEditorStore((s) => s.selectionText)
  function genMessages(instruction: string): MessagesType {
    let messages: MessagesType = []
    if (!instruction.trim()) return messages

    // system message
    messages.push(systemMessage)

    // selected content message
    if (selectionText) {
      let txt = selectionText
      if (txt.length > AI_CONTEXT_MAX_LENGTH) {
        txt = txt.slice(0, AI_CONTEXT_MAX_LENGTH) + '...' // 截断
      }
      messages.push({ role: 'user', content: t('contentWillHandle') })
      messages.push({ role: 'assistant', content: txt })
    }

    // history messages
    const historyMessages = buildHistoryMessages(chatList || [], AI_PANEL_HISTORY_TURNS, AI_CONTEXT_MAX_LENGTH)
    if (historyMessages.length > 0) {
      messages = messages.concat(historyMessages)
    }

    // current message
    messages.push({ role: 'user', content: instruction })

    return messages
  }

  function handleClick() {
    if (!instruction.trim()) return
    const messages = genMessages(instruction)
    onRequestAI(messages)
  }

  const [composition, setComposition] = useState(false) // 中文输入法状态
  function handleCompositionStart() {
    setComposition(true)
  }
  function handleCompositionEnd() {
    setComposition(false)
  }

  function handleKeydown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const { key } = event
    if (key === 'Enter') {
      if (!instruction.trim()) return
      if (composition) return
      event.preventDefault()
      handleClick() // 触发点击事件
    }
    if (key === 'Escape') {
      emitter.emit(EVENT_KEY_FOCUS_EDITOR)
    }
  }

  return (
    <div
      className={cn(
        'w-full rounded-xl p-1 py-0 border shadow border-secondary-foreground hover:border-blue-400 relative overflow-hidden',
        isFocus && 'border-blue-600 shadow-lg'
      )}
    >
      <Textarea
        placeholder="输入 AI 指令，例如：如何写前端简历？"
        className="w-full h-12 mt-2 bg-inherit border-none focus-visible:ring-offset-0 focus-visible:ring-0"
        rows={1}
        maxLength={300}
        tabIndex={-1}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeydown}
        onChange={(e) => setInstruction(e.target.value)}
        ref={inputRef}
        value={instruction}
        disabled={loading}
      />
      {delay > 0 && <span className="text-xs text-gray-400 ml-2">{delay}s</span>}
      <Button
        variant="ghost"
        size="icon"
        className={cn('absolute bottom-0 right-0 p-1 h-8 w-8', isFocus ? 'text-blue-600' : 'opacity-70')}
        onClick={handleClick}
        disabled={!instruction}
      >
        {!loading && <CornerDownLeft size={16} />}
        {loading && <LoaderCircle size={16} className="animate-spin" />}
      </Button>
      {loading && (
        <Button
          variant="ghost"
          size="icon"
          disabled={!loading}
          onClick={onAbortRequestAI}
          className="absolute bottom-0 left-0 p-1 h-8 w-8"
        >
          <CircleStop size={16} />
        </Button>
      )}
    </div>
  )
})

AIInput.displayName = 'AIInput'

export default AIInput
