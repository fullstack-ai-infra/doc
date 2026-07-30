import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const extensionName = 'codeBlockTabIndent'

export const CodeBlockTabIndent = Extension.create({
  name: extensionName,

  //自定义插件，用于tab 键处理缩进
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey(extensionName),
        props: {
          // handleKeyDown是ProseMirror 插件 API 的一部分，用于在插件中捕获和处理键盘事件。
          handleKeyDown(view, event) {
            if (event.key === 'Tab') {
              const { state, dispatch } = view
              const { $from, empty } = state.selection
              if (empty) {
                if ($from.parent.type.name === 'codeBlock') {
                  event.preventDefault()
                  // 创建一个事务，在当前光标位置插入 缩进(4个空格)
                  const tr = state.tr.insertText('    ', $from.pos)
                  // 派发该事务，从而更新文档内容并通知编辑器视图进行更新。
                  dispatch(tr)
                  // true，表示事件已经处理，不需要再传递给其他插件或默认行为
                  return true
                }
              }
            }
            // false，表示事件未处理，可以继续传递给其他插件或默认行为
            return false
          },
        },
      }),
    ]
  },
})
