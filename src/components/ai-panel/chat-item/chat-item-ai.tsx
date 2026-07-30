import { useState } from 'react'
import { Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import AIMarkdownContent from './ai-markdown-content'

interface IProps {
  content: string
}

export default function ChatItemAI(props: IProps) {
  const { content } = props
  const t = useTranslations('AIInput')

  const [viewMore, setViewMore] = useState(false)

  return (
    <div className="flex items-start gap-1 my-1">
      <div className="w-5">
        <Bot className="w-5 h-5 text-blue-500 mt-1" />
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 dark:text-gray-300 px-2 py-1 rounded-md mr-2 flex-auto overflow-x-auto">
        <div className={cn('prose dark:prose-invert max-w-none', viewMore ? '' : 'max-h-60 overflow-y-hidden')}>
          <AIMarkdownContent content={content} />
        </div>
        <div className="mt-1">
          <Button variant="link" className="p-1 m-1 h-6" onClick={() => setViewMore(!viewMore)}>
            {viewMore ? t('viewLess') : t('viewMore')}
          </Button>
        </div>
      </div>
    </div>
  )
}
