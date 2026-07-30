import { Button } from '@/components/ui/button'
import { MoveUpRight } from 'lucide-react'
import { MessagesType, useGenSystemMessage } from '../hooks/useGenMessages'
import { AI_CONTEXT_MAX_LENGTH } from '@/constants'
import { useTranslations } from 'next-intl'
import { useGetEditor } from '@/components/editor'

interface IProps {
  onRequestAI: (message: MessagesType) => void
  setInstruction: (instruction: string) => void
}

export default function ContinueMenu(props: IProps) {
  const { onRequestAI, setInstruction } = props
  const editor = useGetEditor()

  const t = useTranslations('AIInput')

  const systemMessage = useGenSystemMessage()

  function genMessages(instruction: string): MessagesType {
    if (editor == null) return []

    // messages
    const messages: MessagesType = []
    messages.push(systemMessage) // system message

    // context message
    const selection = editor.state.selection
    let prevText = editor.view.state.doc.textBetween(0, selection.head) // 选区之前的文本内容
    if (prevText.trim() !== '') {
      messages.push({ role: 'user', content: t('existingContent') })
      if (prevText.length > AI_CONTEXT_MAX_LENGTH) {
        // 上下文内容不能太多，否则会影响速度
        prevText = prevText.slice(-AI_CONTEXT_MAX_LENGTH)
      }
      messages.push({ role: 'assistant', content: prevText })
    }

    // current message
    messages.push({ role: 'user', content: instruction })
    return messages
  }

  function handleClick() {
    if (editor == null) return

    const instruction = t('continueDesc')
    const messages = genMessages(instruction)

    setInstruction(instruction)
    onRequestAI(messages)
  }

  if (editor == null) return null

  return (
    <Button onClick={handleClick} variant="ghost" className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400">
      {t('continue')}
      <MoveUpRight className="h-4 w-4" />
    </Button>
  )
}
