import { Button } from '@/components/ui/button'
import { MoveUpRight, Ellipsis } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  MessagesType,
  useGenSystemMessage,
  useGenSelectedContentMessages,
} from '@/components/ai-panel/hooks/useGenMessages'
import { useTranslations } from 'next-intl'
import { EVENT_KEY_EDITOR_AI_MENU } from '@/constants'
import emitter from '@/lib/emitter'
import { useDialogStore } from '@/stores/dialog-store'

export default function TranslateMenu() {
  const t = useTranslations('AIInput')

  const systemMessage = useGenSystemMessage()
  const selectedContentMessages = useGenSelectedContentMessages()

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

  function handleClick(lang: string) {
    const instruction = t('translateDesc', { lang })
    const messages = genMessages(instruction)

    // console.log('translate', instruction, messages)
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
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400">
          {t('translate')}
          <Ellipsis className="h-4 w-4 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="ml-40 -mt-10 w-auto py-1 px-2">
        <div className="flex flex-col">
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
        </div>
      </PopoverContent>
    </Popover>
  )
}
