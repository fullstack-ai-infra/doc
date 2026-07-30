import { useEffect } from 'react'
import { Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import emitter from '@/lib/emitter'
import { EVENT_KEY_FOCUS_CONTENT } from '@/constants'

export default function useFocusEditorFromTitleInput(editor: Editor | null) {
  // insert a paragraph at the beginning when title input enter
  useEffect(() => {
    // 聚焦到编辑器内容区域
    function handler() {
      if (!editor) return

      const { dispatch } = editor.view
      const { tr, schema } = editor.state

      // 聚焦到内容区域
      editor.chain().focus()
      // 创建段落 node
      const newParagraph = schema.nodes.paragraph.create(null, null)
      // 创建一个在文章开头插入段落的事务
      const transaction = tr.insert(0, newParagraph)
      // 文档的开始位置
      const startPos = transaction.doc.resolve(0)
      // 光标选择到文档开始的位置
      transaction.setSelection(TextSelection.near(startPos))
      // 派发事务
      dispatch(transaction)
    }
    emitter.on(EVENT_KEY_FOCUS_CONTENT, handler)
    return () => emitter.off(EVENT_KEY_FOCUS_CONTENT, handler)
  }, [editor])
}
