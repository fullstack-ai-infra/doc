import { Button } from '@/components/ui/button'
import { MoveUpRight } from 'lucide-react'
import { MessagesType, useGenSystemMessage } from '../hooks/useGenMessages'
import { useTranslations } from 'next-intl'

interface IProps {
  isFocus: boolean
  onRequestAI: (message: MessagesType) => void
  setInstruction: (instruction: string) => void
}

export default function OutlineMenu(props: IProps) {
  const { isFocus, onRequestAI, setInstruction } = props
  const systemMessage = useGenSystemMessage()
  const t = useTranslations('AIInput')

  function genMessages(instruction: string): MessagesType {
    // messages
    const messages: MessagesType = []
    messages.push(systemMessage) // system message

    // current message
    messages.push({ role: 'user', content: instruction })
    return messages
  }

  function handleClick() {
    const instruction = t('outlineDesc')
    const messages = genMessages(instruction)

    setInstruction(instruction)
    onRequestAI(messages)
  }

  return (
    <Button onClick={handleClick} variant="link" className={isFocus ? 'text-blue-600' : 'opacity-70'}>
      {t('outline')}
      <MoveUpRight className="h-4 w-4" />
    </Button>
  )
}
