import { Button } from '@/components/ui/button'
import { MoveUpRight } from 'lucide-react'
import { MessagesType, useGenSystemMessage } from '../hooks/useGenMessages'
import { AI_CONTEXT_MAX_LENGTH } from '@/constants'
import { useTranslations } from 'next-intl'
import { useEditorStore } from '@/stores/editor-store'

interface IProps {
  isFocus: boolean
  onRequestAI: (message: MessagesType) => void
  setInstruction: (instruction: string) => void
}

export default function ContinueMenu(props: IProps) {
  const { isFocus, onRequestAI, setInstruction } = props

  const t = useTranslations('AIInput')

  const systemMessage = useGenSystemMessage()

  const prevText = useEditorStore((state) => state.prevText)

  function genMessages(instruction: string): MessagesType {
    // messages
    const messages: MessagesType = []
    messages.push(systemMessage) // system message

    // context message
    let prevText2 = prevText || ''
    if (prevText2.trim() !== '') {
      messages.push({ role: 'user', content: t('existingContent') })
      if (prevText2.length > AI_CONTEXT_MAX_LENGTH) {
        // 上下文内容不能太多，否则会影响速度
        prevText2 = prevText2.slice(-AI_CONTEXT_MAX_LENGTH)
      }
      messages.push({ role: 'assistant', content: prevText2 })
    }

    // current message
    messages.push({ role: 'user', content: instruction })
    return messages
  }

  function handleClick() {
    const instruction = t('continueDesc')
    const messages = genMessages(instruction)
    setInstruction(instruction)
    onRequestAI(messages)
  }

  return (
    <Button onClick={handleClick} variant="link" className={isFocus ? 'text-blue-600' : 'opacity-70'}>
      {t('continue')}
      <MoveUpRight className="h-4 w-4" />
    </Button>
  )
}
