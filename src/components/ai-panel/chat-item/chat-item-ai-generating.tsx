import { useEffect, useRef } from 'react'
import { Bot } from 'lucide-react'
import scrollIntoView from 'scroll-into-view-if-needed'
import { useTranslations } from 'next-intl'
import AIMarkdownContent from './ai-markdown-content'

interface IProps {
  content: string
}

export default function ChatItemAIGenerating(props: IProps) {
  const { content } = props
  const t = useTranslations('AIInput')

  // 滚动到最底部
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (bottomRef.current == null) return
    scrollIntoView(bottomRef.current!, {
      scrollMode: 'if-needed',
      behavior: 'smooth',
      block: 'center',
    })
  }, [content])

  return (
    <div className="flex items-start gap-1 my-1">
      <div className="w-5">
        <Bot className="w-5 h-5 text-blue-500 mt-1" />
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 dark:text-gray-300 px-2 py-1 rounded-md mr-2 flex-auto">
        {!content && (
          <div className="text-center">
            <span className="text-sm text-muted-foreground">{t('AIgenerating')}</span>
          </div>
        )}
        {content && (
          <div className="prose dark:prose-invert max-w-none">
            <AIMarkdownContent content={content} />
          </div>
        )}
        <div ref={bottomRef} className="text-transparent h-1">
          ...
        </div>
      </div>
    </div>
  )
}
