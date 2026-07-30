import { Node } from '@tiptap/core'
import { safeColumnBorder, safeColumnLayout } from '@/lib/tiptap-attribute-safety'

export enum ColumnLayout {
  SidebarLeft = 'sidebar-left',
  SidebarRight = 'sidebar-right',
  TwoColumn = 'two-column',
}

declare module '@tiptap/core' {
  // 扩展 TS 接口属性
  interface Commands<ReturnType> {
    columns: {
      setColumns: () => ReturnType
      setLayout: (layout: ColumnLayout) => ReturnType
      deleteColumns: () => ReturnType
      setWithBorder: (val: boolean) => ReturnType
    }
  }
}

export const Columns = Node.create({
  name: 'columns',

  // https://tiptap.dev/docs/editor/api/schema#group
  // 这样，其他的 Node 就可以在 content 中写 'columns'
  group: 'columns',

  content: 'column column',

  // https://tiptap.dev/docs/editor/api/schema#defining
  // 内容被替换时，继续保留 column
  defining: true,

  isolating: true,

  addAttributes() {
    return {
      layout: {
        default: ColumnLayout.TwoColumn,
        parseHTML: (element) =>
          safeColumnLayout(element.getAttribute('data-layout') || element.getAttribute('layout')) ||
          ColumnLayout.TwoColumn,
        renderHTML: (attributes) => ({
          'data-layout': safeColumnLayout(attributes.layout) || ColumnLayout.TwoColumn,
        }),
      },
      withBorder: {
        default: true,
        parseHTML: (element) => (element.getAttribute('data-with-border') === 'false' ? false : true),
        renderHTML: (attributes) => ({
          'data-with-border': String(safeColumnBorder(attributes.withBorder)),
        }),
      },
    }
  },

  addCommands() {
    return {
      setColumns:
        () =>
        ({ commands }) =>
          commands.insertContent(
            // `data-type="column"` 和 `data-position="left"` 都是在 Column.ts 中定义的
            `<div data-type="columns"><div data-type="column" data-position="left"><p></p></div><div data-type="column" data-position="right"><p></p></div></div>`
          ),
      setLayout:
        (layout: ColumnLayout) =>
        ({ commands }) =>
          commands.updateAttributes('columns', { layout }),
      setWithBorder:
        (val: boolean) =>
        ({ commands }) =>
          commands.updateAttributes('columns', { withBorder: val }),
      deleteColumns:
        () =>
        ({ commands }) =>
          commands.deleteNode('columns'),
    }
  },

  renderHTML({ node }) {
    const layout = safeColumnLayout(node.attrs.layout) || ColumnLayout.TwoColumn
    const withBorder = safeColumnBorder(node.attrs.withBorder)
    return [
      'div',
      {
        'data-type': 'columns',
        'data-layout': layout,
        'data-with-border': String(withBorder),
        class: `layout-${layout} with-border-${withBorder}`,
      },
      0,
    ]
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="columns"]',
      },
    ]
  },
})

export default Columns
