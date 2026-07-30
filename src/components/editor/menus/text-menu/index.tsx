'use client'

import { BubbleMenu, Editor } from '@tiptap/react'
import AIMenu from './ai-menu/index'
import BasicMenu from './basic-menu'
import AlignMenu from './align-menu'
import MoreMenu from './more-menu'
import HighlightMenu from './highlight-menu'
import ContentTypeMenu from './content-type'
import SetLinkMenu from './set-link-menu'
import { isTextSelected } from '@/components/editor/utils/isTextSelected'
import Wrapper from '../bubble-menu-wrapper'
import { useGetEditor } from '@/components/editor'

export default function TextMenu() {
  const editor = useGetEditor()
  if (editor == null) return
  if (!editor.isEditable) return

  function shouldShow(editor: Editor) {
    // 某些类型，不显示文本菜单
    const customTypes = ['codeBlock', 'mermaidBlock', 'imageBlock', 'imageUpload', 'horizontalRule', 'link', 'table']
    if (customTypes.some((type) => editor.isActive(type))) return false

    // 其他，看是否选中了文本
    return isTextSelected({ editor })
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, moveTransition: 'transform 0.2s ease-out' }}
      shouldShow={() => shouldShow(editor)}
    >
      <Wrapper>
        <AIMenu />
        <ContentTypeMenu />
        <BasicMenu />
        <SetLinkMenu />
        <HighlightMenu />
        <AlignMenu />
        <MoreMenu />
      </Wrapper>
    </BubbleMenu>
  )
}
