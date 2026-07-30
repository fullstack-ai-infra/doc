import { BubbleMenu } from '@tiptap/react'
import { useCallback } from 'react'
import { sticky } from 'tippy.js'
import { Columns2, PanelLeft, PanelRight, Trash2, TextSelect } from 'lucide-react'
import { getRenderContainer } from '@/components/editor/utils/getRenderContainer'
import { ColumnLayout } from '@/components/editor/extensions/column/Columns'
import Wrapper from '../bubble-menu-wrapper'
import { Button } from '@/components/ui/button'
import { MenuProps } from '../types'
import { useGetEditor } from '@/components/editor'

export default function ColumnsMenu(props: MenuProps) {
  const { appendTo } = props
  const editor = useGetEditor()

  // 计算菜单的定位
  const getReferenceClientRect = useCallback(() => {
    if (editor == null) return new DOMRect(-1000, -1000, 0, 0)

    const renderContainer = getRenderContainer(editor, 'columns')
    const rect = renderContainer?.getBoundingClientRect() || new DOMRect(-1000, -1000, 0, 0)

    return rect
  }, [editor])

  // 菜单是否应该显示
  const shouldShow = useCallback(() => {
    if (editor == null) return false

    const isColumns = editor.isActive('columns')
    if (!isColumns) return false

    const { empty } = editor.state.selection
    if (!empty) return false

    return true
  }, [editor])

  // left
  const onColumnLeft = useCallback(() => {
    editor && editor.chain().focus().setLayout(ColumnLayout.SidebarLeft).run()
  }, [editor])
  const isLeftActive = useCallback(() => {
    return (
      editor &&
      editor.isActive('columns', {
        layout: ColumnLayout.SidebarLeft,
      })
    )
  }, [editor])

  // right
  const onColumnRight = useCallback(() => {
    editor && editor.chain().focus().setLayout(ColumnLayout.SidebarRight).run()
  }, [editor])
  const isRightActive = useCallback(() => {
    return (
      editor &&
      editor.isActive('columns', {
        layout: ColumnLayout.SidebarRight,
      })
    )
  }, [editor])

  // two
  const onColumnTwo = useCallback(() => {
    editor && editor.chain().focus().setLayout(ColumnLayout.TwoColumn).run()
  }, [editor])
  const isTwoActive = useCallback(() => {
    return (
      editor &&
      editor.isActive('columns', {
        layout: ColumnLayout.TwoColumn,
      })
    )
  }, [editor])

  // withBorder
  const withBorder = useCallback(() => {
    return (
      editor &&
      editor.isActive('columns', {
        withBorder: true,
      })
    )
  }, [editor])
  const onWithBorderToggle = useCallback(() => {
    editor && editor.chain().focus().setWithBorder(!withBorder()).run()
  }, [editor, withBorder])

  if (editor == null) return
  if (!editor.isEditable) return

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={`columnsMenu-${crypto.randomUUID()}`} // 多个菜单，需要不同的 key
      updateDelay={100}
      shouldShow={shouldShow}
      // BubbleMenu 是基于 tippy 开发的，所以它可以传入一些 tippy 的配置 https://atomiks.github.io/tippyjs/v6/all-props/
      tippyOptions={{
        offset: [0, 8],
        popperOptions: {
          modifiers: [{ name: 'flip', enabled: false }],
        },
        getReferenceClientRect,
        appendTo: () => appendTo?.current,
        plugins: [sticky],
        sticky: 'popper',
      }}
    >
      <Wrapper>
        <Button size="sm" onClick={onColumnLeft} variant={isLeftActive() ? 'secondary' : 'ghost'}>
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={onColumnTwo} variant={isTwoActive() ? 'secondary' : 'ghost'}>
          <Columns2 className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={onColumnRight} variant={isRightActive() ? 'secondary' : 'ghost'}>
          <PanelRight className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={onWithBorderToggle} variant={withBorder() ? 'secondary' : 'ghost'}>
          <TextSelect className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => editor.chain().focus().deleteColumns().run()} variant="ghost">
          <Trash2 className="h-4 w-4" />
        </Button>
      </Wrapper>
    </BubbleMenu>
  )
}
