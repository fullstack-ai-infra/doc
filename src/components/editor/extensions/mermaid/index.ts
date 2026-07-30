import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { safeMermaidCode } from '@/lib/tiptap-attribute-safety'
import MermaidBlockView from './mermaid-block-view'

export const DEFAULT_MERMAID_CODE = `graph TD
  A[Start] --> B[Process]
  B --> C[End]`

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaidBlock: {
      setMermaidBlock: (attrs?: { code?: string }) => ReturnType
    }
  }
}

const MermaidBlock = Node.create({
  name: 'mermaidBlock',

  group: 'block',

  atom: true,

  draggable: true,

  selectable: true,

  isolating: true,

  addAttributes() {
    return {
      code: {
        default: DEFAULT_MERMAID_CODE,
        parseHTML: (element) => safeMermaidCode(element.getAttribute('data-code')) || DEFAULT_MERMAID_CODE,
        renderHTML: (attributes) => ({
          'data-code': safeMermaidCode(attributes.code),
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid-block"]',
      },
    ]
  },

  renderHTML({ node }) {
    return [
      'div',
      mergeAttributes({
        'data-code': safeMermaidCode(node.attrs.code),
        'data-type': 'mermaid-block',
      }),
    ]
  },

  addCommands() {
    return {
      setMermaidBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              code: attrs?.code || DEFAULT_MERMAID_CODE,
            },
          }),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidBlockView)
  },
})

export default MermaidBlock
