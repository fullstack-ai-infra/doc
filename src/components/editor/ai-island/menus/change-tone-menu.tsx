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

export default function ChangeToneMenu(props: IProps) {
  const { onRequestAI, setInstruction } = props
  const editor = useGetEditor()

  const systemMessage = useGenSystemMessage()
  const selectedContentMessages = useGenSelectedContentMessages(editor)

  const t = useTranslations('AIInput')

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

  function handleClick(tone: string) {
    if (editor == null) return

    const { empty } = editor.state.selection
    if (empty) return

    const instruction = t('toneDesc', { tone })
    const messages = genMessages(instruction)

    setInstruction(instruction)
    onRequestAI(messages)
  }

  if (editor == null) return null

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <Button variant="ghost" className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400">
          {t('tone')}
          <Ellipsis className="h-4 w-4 ml-1" />
        </Button>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="p-1 w-auto">
        <Button
          variant="ghost"
          onClick={() => handleClick(t('professional'))}
          className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400"
        >
          {t('professional')}
          <MoveUpRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleClick(t('casual'))}
          className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400"
        >
          {t('casual')}
          <MoveUpRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleClick(t('neutral'))}
          className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400"
        >
          {t('neutral')}
          <MoveUpRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleClick(t('formal'))}
          className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400"
        >
          {t('formal')}
          <MoveUpRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => handleClick(t('friendly'))}
          className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400"
        >
          {t('friendly')}
          <MoveUpRight className="h-4 w-4" />
        </Button>
      </HoverCardContent>
    </HoverCard>
  )
}
