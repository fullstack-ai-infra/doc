import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { EDITOR_PADDING_BOTTOM } from '@/constants'

export const addParagraph = Extension.create({
  name: 'addParagraph',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('addParagraph'),
        props: {
          handleDOMEvents: {
            // 点击事件处理函数，在编辑器的 DOM 元素被点击时被调用
            click(view, event) {
              const { state, dispatch } = view
              const { schema, tr, doc } = state

              // 获取编辑器的 DOM 元素
              const editorElement = view.dom
              // 获取编辑器元素的尺寸和位置信息
              const editorBounds = editorElement.getBoundingClientRect()
              // 获取用户点击编辑器中点击事件发生时的 Y 轴坐标
              const clickY = event.clientY

              // 获取编辑器内部最后一个节点
              const lastNode = doc.lastChild
              // 获取编辑器文档内容的最后一个位置
              const lastPos = doc.content.size
              // 将文档中的最后一个位置转换为视图中的坐标
              const lastCoords = view.coordsAtPos(lastPos)

              // 判断点击事件是否发生在编辑器底部的 padding-bottom 区域
              const isClickInBottomPadding = clickY > editorBounds.bottom - EDITOR_PADDING_BOTTOM

              // 判断点击事件是否发生在编辑器内部的最后一个节点底部之外的区域
              const isClickOutLastNodeBottom = clickY > lastCoords.bottom

              if (isClickInBottomPadding || isClickOutLastNodeBottom) {
                // 判断最后一个节点是否为空段落，如果是，则不增加新的段落
                if (lastNode && lastNode.type.name === 'paragraph' && lastNode.textContent === '') {
                  return false
                }
                // 获取当前文档内容的结束位置
                const endPos = doc.content.size

                // 插入新的段落并将光标移动至新段落开头的位置
                // 1. 创建新的段落节点
                const newParagraph = schema.nodes.paragraph.create()
                // 2. 创建一个事务，在当前文档的结束位置插入新的段落节点
                const transaction = tr.insert(endPos, newParagraph)
                // 3. 获取插入节点之后的位置
                const resolvedPos = transaction.doc.resolve(endPos + 1)
                // 4. 将编辑器的光标移动到新插入段落的开始位置
                transaction.setSelection(TextSelection.near(resolvedPos))

                // 将事务派发至编辑器的状态当中
                dispatch(transaction)
                // 确保编辑器的视图聚焦在插入新段落之后的文档部分
                view.focus()
                // 告诉 ProseMirror 的事件处理系统，此事件已被处理，不需要执行默认的处理
                return true
              }
              return false
            },
          },
        },
      }),
    ]
  },
})

export default addParagraph
