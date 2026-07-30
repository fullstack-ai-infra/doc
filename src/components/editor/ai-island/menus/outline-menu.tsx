import { Button } from '@/components/ui/button'
import { MoveUpRight } from 'lucide-react'
import { MessagesType, useGenSystemMessage } from '../hooks/useGenMessages'
import { useTranslations } from 'next-intl'
import { useGetEditor } from '@/components/editor'

interface IProps {
  onRequestAI: (message: MessagesType) => void
  setInstruction: (instruction: string) => void
}

export default function OutlineMenu(props: IProps) {
  const { onRequestAI, setInstruction } = props
  const editor = useGetEditor()
  const systemMessage = useGenSystemMessage()
  const t = useTranslations('AIInput')

  function genMessages(instruction: string): MessagesType {
    if (editor == null) return []

    // messages
    const messages: MessagesType = []
    messages.push(systemMessage) // system message

    // current message
    messages.push({ role: 'user', content: instruction })
    return messages
  }

  function handleClick() {
    if (editor == null) return

    const instruction = t('outlineDesc')
    const messages = genMessages(instruction)

    setInstruction(instruction)
    onRequestAI(messages)
  }

  return (
    <Button onClick={handleClick} variant="ghost" className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400">
      {t('outline')}
      <MoveUpRight className="h-4 w-4" />
    </Button>
  )
}
