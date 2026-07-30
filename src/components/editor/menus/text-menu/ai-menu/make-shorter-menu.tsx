import { Button } from '@/components/ui/button'
import { MoveUpRight } from 'lucide-react'
import {
  MessagesType,
  useGenSystemMessage,
  useGenSelectedContentMessages,
} from '@/components/ai-panel/hooks/useGenMessages'
import { useTranslations } from 'next-intl'
import { EVENT_KEY_EDITOR_AI_MENU } from '@/constants'
import emitter from '@/lib/emitter'
import { useDialogStore } from '@/stores/dialog-store'

export default function MakeShorterMenu() {
  const systemMessage = useGenSystemMessage()
  const selectedContentMessages = useGenSelectedContentMessages()

  const t = useTranslations('AIInput')

  const AIPanelOpen = useDialogStore((s) => s.AIPanelOpen)
  const setAIPanelOpen = useDialogStore((s) => s.setAIPanelOpen)

  function genMessages(instruction: string): MessagesType {
    // messages
    let messages: MessagesType = []
    messages.push(systemMessage) // system message

    // selected content message
    messages = messages.concat(selectedContentMessages)

    // current message
    messages.push({ role: 'user', content: instruction })
    return messages
  }

  function handleClick() {
    const instruction = t('simplyDesc')
    const messages = genMessages(instruction)

    // setInstruction(instruction)
    // onRequestAI(messages)
    console.log('make shorter', instruction, messages)

    if (AIPanelOpen) {
      emitter.emit(EVENT_KEY_EDITOR_AI_MENU, {
        instruction,
        messages,
      })
    } else {
      setAIPanelOpen(true)
      setTimeout(() => {
        emitter.emit(EVENT_KEY_EDITOR_AI_MENU, {
          instruction,
          messages,
        })
      }, 500) // 等待 AI 输入框渲染完成
    }
  }

  return (
    <Button onClick={handleClick} variant="ghost" className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400">
      {t('simply')}
      <MoveUpRight className="h-4 w-4" />
    </Button>
  )
}
