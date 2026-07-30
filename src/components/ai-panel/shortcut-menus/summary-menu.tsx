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

export default function SummaryMenu(props: IProps) {
  const { isFocus, onRequestAI, setInstruction } = props

  const t = useTranslations('AIInput')

  const systemMessage = useGenSystemMessage()

  const headings = useEditorStore((s) => s.headings)
  const textContent = useEditorStore((s) => s.textContent)

  function genMessages(instruction: string): MessagesType {
    // messages
    const messages: MessagesType = []
    messages.push(systemMessage) // system message

    // heading message
    if (headings.length > 0) {
      let headingText = ''
      headings.forEach((h) => {
        const level = h.attrs.level
        const text = h.textContent
        headingText += `${'#'.repeat(level)} ${text}\n`
      })
      messages.push({ role: 'user', content: t('docTitleAndOutline') })
      messages.push({ role: 'assistant', content: headingText })
    }

    // context message
    if (textContent.length <= AI_CONTEXT_MAX_LENGTH) {
      messages.push({ role: 'user', content: t('docContent') })
      messages.push({ role: 'assistant', content: textContent })
    } else {
      // 内容太多，只能提交部分内容
      // 前半部分内容
      let halfMaxLength = Math.floor(AI_CONTEXT_MAX_LENGTH / 2)
      let content1 = textContent.slice(0, halfMaxLength)
      messages.push({ role: 'user', content: t('docStartPart', { halfMaxLength }) })
      messages.push({ role: 'assistant', content: content1 })
      // 后半部分内容
      let content2 = textContent.slice(-halfMaxLength)
      messages.push({ role: 'user', content: t('docEndPart', { halfMaxLength }) })
      messages.push({ role: 'assistant', content: content2 })
    }

    // current message
    messages.push({ role: 'user', content: instruction })
    return messages
  }

  function handleClick() {
    const instruction = t('summaryDesc')
    const messages = genMessages(instruction)
    console.log('summary messages:', messages)

    setInstruction(instruction)
    onRequestAI(messages)
  }

  return (
    <Button onClick={handleClick} variant="link" className={isFocus ? 'text-blue-600' : 'opacity-70'}>
      {t('summary')}
      <MoveUpRight className="h-4 w-4" />
    </Button>
  )
}
