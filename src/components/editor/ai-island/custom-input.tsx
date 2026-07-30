import { forwardRef, ForwardedRef, useMemo, useState } from 'react'
import { Sparkles, CornerDownLeft, LoaderCircle, CircleStop } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MessagesType, useGenSystemMessage } from './hooks/useGenMessages'
import { useTranslations } from 'next-intl'
import { AI_CONTEXT_MAX_LENGTH } from '@/constants'
import { useGetEditor } from '@/components/editor'

interface IProps {
  isFocus: boolean
  loading: boolean
  isSelectionEmpty: boolean
  onRequestAI: (message: MessagesType) => void
  onAbortRequestAI: () => void
  instruction: string
  setInstruction: (instruction: string) => void
  delay: number
}

const CustomInput = forwardRef((props: IProps, inputRef: ForwardedRef<HTMLInputElement>) => {
  const t = useTranslations('AIInput')

  const editor = useGetEditor()

  const { onRequestAI, onAbortRequestAI, setInstruction, isFocus, loading, isSelectionEmpty, instruction, delay } =
    props

  const systemMessage = useGenSystemMessage()

  function genMessages(instruction: string): MessagesType {
    let messages: MessagesType = []
    if (!instruction.trim()) return messages
    if (editor == null) return messages

    // system message
    messages.push(systemMessage)

    // selected content message
    if (!isSelectionEmpty) {
      const { empty, from, to } = editor.state.selection
      if (!empty) {
        let selectedText = editor.state.doc.textBetween(from, to)
        if (selectedText.length > AI_CONTEXT_MAX_LENGTH) {
          selectedText = selectedText.slice(0, AI_CONTEXT_MAX_LENGTH) + '...' // 截断
        }
        messages.push({ role: 'user', content: t('contentWillHandle') })
        messages.push({ role: 'assistant', content: selectedText })
      }
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

  function handleKeydown(event: React.KeyboardEvent<HTMLInputElement>) {
    const { key } = event
    if (key === 'Enter') {
      if (!instruction.trim()) return
      if (composition) return
      const messages = genMessages(instruction)
      onRequestAI(messages)
    }
    if (key === 'Escape') {
      editor?.commands.focus()
    }
  }

  // placeholder
  const placeholder = useMemo(() => {
    if (!isFocus) return t('inputPlaceholder1')
    if (isSelectionEmpty) return t('inputPlaceholder2')
    else return t('inputPlaceholder3')
  }, [isFocus, isSelectionEmpty, t])

  return (
    <div
      className={cn(
        'rounded-xl p-1 py-0 border border-gray-400 shadow flex items-center justify-start hover:border-secondary-foreground',
        isFocus && 'border-blue-600 hover:border-blue-600 shadow-lg'
      )}
    >
      <Sparkles
        size={16}
        className={cn('ml-2', isFocus ? 'text-blue-600' : 'opacity-50', loading && 'animate-pulse')}
      />
      <div className="flex-auto flex items-center justify-start">
        <Input
          placeholder={placeholder}
          tabIndex={-1}
          value={instruction}
          maxLength={300}
          disabled={loading}
          ref={inputRef}
          onKeyDown={handleKeydown}
          onChange={(e) => setInstruction(e.target.value)}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          className="bg-inherit border-none focus-visible:ring-offset-0 focus-visible:ring-0"
        />
        {delay > 0 && <span className="text-xs text-gray-400 ml-2">{delay}s</span>}
        <Button
          variant="ghost"
          size="icon"
          className={cn(isFocus ? 'text-blue-600' : 'opacity-50')}
          onClick={handleClick}
          disabled={!instruction}
        >
          {!loading && <CornerDownLeft size={16} />}
          {loading && <LoaderCircle size={16} className="animate-spin" />}
        </Button>
        {loading && (
          <Button variant="ghost" size="icon" onClick={onAbortRequestAI}>
            <CircleStop size={16} />
          </Button>
        )}
      </div>
    </div>
  )
})

CustomInput.displayName = 'CustomInput'

export default CustomInput
