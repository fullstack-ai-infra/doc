import { BubbleMenu } from '@tiptap/react'
import { useCallback } from 'react'
import { ArrowUpToLine, ArrowDownToLine, Trash2 } from 'lucide-react'
import { MenuProps, ShouldShowProps } from '../types'
import { isRowGripSelected } from './utils'
import Wrapper from '../bubble-menu-wrapper'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { useGetEditor } from '@/components/editor'

export const TableRowMenu = (props: MenuProps) => {
  const { appendTo } = props
  const t = useTranslations('editor')
  const editor = useGetEditor()

  const shouldShow = useCallback(
    ({ view, state, from }: ShouldShowProps) => {
      if (editor == null) return false
      if (!state || !from) {
        return false
      }
      return isRowGripSelected({ editor, view, state, from })
    },
    [editor]
  )

  // 前面插入行
  const onAddRowBefore = useCallback(() => {
    editor && editor.chain().focus().addRowBefore().run()
  }, [editor])

  // 后面插入行
  const onAddRowAfter = useCallback(() => {
    editor && editor.chain().focus().addRowAfter().run()
  }, [editor])

  // 删除行
  const onDeleteRow = useCallback(() => {
    editor && editor.chain().focus().deleteRow().run()
  }, [editor])

  if (editor == null) return
  if (!editor.isEditable) return

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableRowMenu"
      updateDelay={0}
      shouldShow={shouldShow}
      tippyOptions={{
        placement: 'left',
        offset: [0, 8],
        popperOptions: {
          modifiers: [{ name: 'flip', enabled: false }],
        },
        appendTo: () => {
          return appendTo?.current
        },
      }}
    >
      <Wrapper className="flex-col items-start" menuType="table-menu">
        <Button onClick={onAddRowBefore} size="sm" variant="ghost">
          <ArrowUpToLine className="w-4 h-4 mr-1" />
          {t('insertRowBefore')}
        </Button>
        <Button onClick={onAddRowAfter} size="sm" variant="ghost">
          <ArrowDownToLine className="w-4 h-4 mr-1" />
          {t('insertRowAfter')}
        </Button>
        <Button onClick={onDeleteRow} size="sm" className="w-full flex justify-start" variant="ghost">
          <Trash2 className="w-4 h-4 mr-1" />
          {t('removeRow')}
        </Button>
      </Wrapper>
    </BubbleMenu>
  )
}
