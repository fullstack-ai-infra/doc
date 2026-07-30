import { BubbleMenu } from '@tiptap/react'
import { useCallback, useState, useEffect } from 'react'
import Wrapper from '../bubble-menu-wrapper'
import { LinkPreviewMenu } from './preview-menu'
import { LinkEditPanel } from './edit-panel'
import { MenuProps } from '../types'
import { useGetEditor } from '@/components/editor'

export default function LinkMenu(props: MenuProps) {
  const { appendTo } = props
  const editor = useGetEditor()

  const [showEdit, setShowEdit] = useState(false)

  const shouldShow = useCallback(() => {
    if (editor == null) return false
    const isActive = editor.isActive('link')
    if (!isActive) return false

    const { empty } = editor.state.selection
    if (!empty) return false

    return true
  }, [editor])

  const { href, target } = editor?.getAttributes('link') || {}

  const setLink = (url: string, openInNewTab?: boolean) => {
    editor &&
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url, target: openInNewTab ? '_blank' : '' })
        .run()
    setShowEdit(false)
  }

  const unsetLink = () => {
    editor && editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setShowEdit(false)
    return null
  }

  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      // 每次编辑器状态更新时，检查链接的变化
      const { href: currentHref } = editor.getAttributes('link') || {}
      if (currentHref && currentHref !== href) {
        setShowEdit(false) // 如果检测到链接变化，设置showEdit为false
      }
    }

    // 监听编辑器选区改变
    editor.on('transaction', handleUpdate)

    // 清理函数
    return () => {
      editor.off('transaction', handleUpdate)
    }
  }, [editor, href])

  if (editor == null) return
  if (!editor.isEditable) return

  return (
    <BubbleMenu
      editor={editor}
      updateDelay={0}
      shouldShow={shouldShow}
      tippyOptions={{
        popperOptions: {
          modifiers: [{ name: 'flip', enabled: false }],
        },
        appendTo: () => {
          return appendTo?.current
        },
        onHidden: () => {
          setShowEdit(false)
        },
      }}
    >
      <Wrapper>
        {showEdit ? (
          <LinkEditPanel initialUrl={href} initialOpenInNewTab={target === '_blank'} onSetLink={setLink} />
        ) : (
          <LinkPreviewMenu url={href} onEdit={() => setShowEdit(true)} onClear={unsetLink} />
        )}
      </Wrapper>
    </BubbleMenu>
  )
}
