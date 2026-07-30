import { Button } from '@/components/ui/button'
import { X, Sparkle, BetweenHorizonalStart, Replace } from 'lucide-react'
import { useEffect, useRef } from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import markdownit from 'markdown-it'
import { useTranslations } from 'next-intl'
import { useGetEditor } from '@/components/editor'

const md = markdownit()

interface IProps {
  isSelectionEmpty: boolean
  loading: boolean
  result: string
  setResult: (result: string) => void
  setInstruction: (instruction: string) => void
  reRequestAI: () => void
}

export default function ResultPanel(props: IProps) {
  const { isSelectionEmpty, loading, result = '', setResult, setInstruction, reRequestAI } = props
  const editor = useGetEditor()
  const menuRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('AIInput')

  const resultHtml = md.render(result)
  const innerHtml = { __html: resultHtml }

  // 插入编辑器，考虑换行
  function insertResultToEditor() {
    if (editor == null) return
    if (result) {
      editor.commands.insertContent(resultHtml)
    }
    editor.commands.scrollIntoView()
  }

  useEffect(() => {
    if (menuRef.current == null) return
    // 如果内容太多，需要持续滚动，保证一直能看到菜单
    scrollIntoView(menuRef.current!, {
      scrollMode: 'if-needed',
      behavior: 'smooth',
      block: 'center',
    })
  }, [result])

  // 替换
  function onReplace() {
    if (editor == null) return
    insertResultToEditor()
    editor.commands.focus()
    setResult('')
    setInstruction('')
  }

  // 插入
  function onInsert() {
    if (editor == null) return
    const { to } = editor.state.selection
    editor.commands.focus(to)
    editor.commands.enter()
    insertResultToEditor()
    setResult('')
    setInstruction('')
  }

  // 关闭
  function onClose() {
    setResult('')
    setInstruction('')
    editor?.commands.focus()
  }

  if (editor == null) return null
  if (!result && !loading) return null

  return (
    <div className="border-2 border-blue-600 rounded-lg shadow-lg p-4 pb-2 mb-2">
      <div className="max-h-72 overflow-y-auto">
        {!result && (
          <div className="text-center">
            <span className="text-sm text-muted-foreground">{t('AIgenerating')}</span>
          </div>
        )}
        {result && <div dangerouslySetInnerHTML={innerHtml} className="prose dark:prose-invert max-w-none"></div>}

        <div className="flex justify-center mt-1" ref={menuRef}>
          {/* 处理 AI 结果的菜单：替换，插入，重新生成，取消 */}
          <Button
            onClick={onReplace}
            disabled={loading || isSelectionEmpty}
            variant="ghost"
            className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400"
            tabIndex={-1}
          >
            <Replace className="h-4 w-4 mr-1" />
            {t('replace')}
          </Button>
          <Button
            onClick={onInsert}
            disabled={loading}
            variant="ghost"
            className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400"
            tabIndex={-1}
          >
            <BetweenHorizonalStart className="h-4 w-4 mr-1" />
            {t('insert')}
          </Button>
          <Button
            onClick={reRequestAI}
            disabled={loading}
            variant="ghost"
            className="p-2 text-blue-500 hover:bg-inherit hover:text-blue-400"
            tabIndex={-1}
          >
            <Sparkle className="h-4 w-4 mr-1" />
            {t('regenerate')}
          </Button>
          <Button
            onClick={onClose}
            disabled={loading}
            variant="ghost"
            className="p-2 text-red-500 hover:bg-inherit hover:text-red-400"
            tabIndex={-1}
          >
            <X className="h-4 w-4 mr-1" />
            {t('close')}
          </Button>
        </div>
      </div>
    </div>
  )
}
