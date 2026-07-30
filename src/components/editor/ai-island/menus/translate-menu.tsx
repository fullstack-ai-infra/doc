import { Button } from '@/components/ui/button'
import { MoveUpRight, Ellipsis } from 'lucide-react'
import { MessagesType, useGenSystemMessage, useGenSelectedContentMessages } from '../hooks/useGenMessages'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { useTranslations } from 'next-intl'
import { useGetEditor } from '@/components/editor'

interface IProps {
  onRequestAI: (message: MessagesType) => void
  setInstruction: (instruction: string) => void
}

export default function TranslateMenu(props: IProps) {
  const { onRequestAI, setInstruction } = props
  const editor = useGetEditor()

  const t = useTranslations('AIInput')

  const systemMessage = useGenSystemMessage()
  const selectedContentMessages = useGenSelectedContentMessages(editor)

  function genMessages(instruction: string): MessagesType {
    if (editor == null) return []

    // messages
    let messages: MessagesType = []
    messages.push(systemMessage) // system message

    // selected content message
    messages = messages.concat(selectedContentMessages)

    // current message
    messages.push({ role: 'user', content: instruction })
    return messages
  }

  function handleClick(lang: string) {
    if (editor == null) return

    const { empty } = editor.state.selection
    if (empty) return

    const instruction = t('translateDesc', { lang })
    const messages = genMessages(instruction)

    setInstruction(instruction)
    onRequestAI(messages)
  }

  if (editor == null) return null

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <Button variant="ghost" className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400">
          {t('translate')}
          <Ellipsis className="h-4 w-4 ml-1" />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="p-1 w-auto">
        <Button
          variant="ghost"
          onClick={() => handleClick(t('English'))}
          className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400"
        >
          {t('English')}
          <MoveUpRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleClick(t('Japanese'))}
          className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400"
        >
          {t('Japanese')}
          <MoveUpRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleClick(t('Chinese'))}
          className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400"
        >
          {t('Chinese')}
          <MoveUpRight className="h-4 w-4" />
        </Button>
      </HoverCardContent>
    </HoverCard>
  )
}
