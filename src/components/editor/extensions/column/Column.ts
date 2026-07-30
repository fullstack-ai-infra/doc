import { Node, mergeAttributes } from '@tiptap/core'
import { safeColumnPosition } from '@/lib/tiptap-attribute-safety'

export const Column = Node.create({
  name: 'column',

  content: 'block+',

  // 回车的时候不会新建一个节点，如 H1 回车就会新建一个 H1 节点
  isolating: true,

  addAttributes() {
    return {
      position: {
        default: '',
        parseHTML: (element) => safeColumnPosition(element.getAttribute('data-position')) || '',
        renderHTML: (attributes) => {
          const position = safeColumnPosition(attributes.position)
          return position ? { 'data-position': position } : {}
        },
      },
    }
  },

  // 定义如何输出 HTML
  renderHTML({ HTMLAttributes }) {
    const position = safeColumnPosition(HTMLAttributes['data-position'])
    return ['div', mergeAttributes(position ? { 'data-position': position } : {}, { 'data-type': 'column' }), 0]
  },

  // 定义如何解析传入的 HTML
  parseHTML() {
    return [
      {
        tag: 'div[data-type="column"]',
      },
    ]
  },
})

export default Column
