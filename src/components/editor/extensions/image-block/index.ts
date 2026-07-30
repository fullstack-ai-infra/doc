import { ReactNodeViewRenderer } from '@tiptap/react'
import { mergeAttributes, Range } from '@tiptap/core'
import { Image as BaseImage } from '@tiptap/extension-image'
import ImageBlockView from './image-block-view'

declare module '@tiptap/core' {
  // 扩展 TS 类型
  interface Commands<ReturnType> {
    imageBlock: {
      setImageBlock: (attributes: { src: string }) => ReturnType
      setImageBlockAt: (attributes: { src: string; pos: number | Range }) => ReturnType
      setImageBlockAlign: (align: 'left' | 'center' | 'right') => ReturnType
      setImageBlockWidth: (width: number) => ReturnType
      setImageBlockRatio: (ratio: number) => ReturnType
    }
  }
}

function genMargin(align: string) {
  switch (align) {
    case 'left':
      return '0 auto 0 0'
    case 'right':
      return '0 0 0 auto'
    case 'center':
      return '0 auto'
    default:
      return ''
  }
}

const ImageBlock = BaseImage.extend({
  name: 'imageBlock',

  group: 'block', // 归类为 block 类型

  defining: true,

  isolating: true,

  // 定义属性
  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: (element) => element.getAttribute('src'), // 从 HTML 中解析出属性
        renderHTML: (attributes) => ({
          // 把属性渲染到 HTML 中
          src: attributes.src,
        }),
      },
      width: {
        default: '100%',
        parseHTML: (element) => element.getAttribute('data-width'),
        renderHTML: (attributes) => ({
          'data-width': attributes.width,
        }),
      },
      // 宽高比例
      ratio: {
        default: NaN,
        parseHTML: (element) => element.getAttribute('data-ratio'),
        renderHTML: (attributes) => ({
          'data-ratio': attributes.ratio,
        }),
      },
      // 对齐方式
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align'),
        renderHTML: (attributes) => ({
          'data-align': attributes.align,
        }),
      },
      alt: {
        default: undefined,
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) => ({
          alt: attributes.alt,
        }),
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      {},
      [
        'div',
        { style: `width: ${HTMLAttributes['data-width']}; margin: ${genMargin(HTMLAttributes['data-align'])};` },
        ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)],
      ],
    ]
  },

  addCommands() {
    return {
      // 插入 imageBlock
      setImageBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'imageBlock',
            attrs: { src: attrs.src },
          })
        },

      // 在指定位置插入 imageBlock
      setImageBlockAt:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContentAt(attrs.pos, {
            type: 'imageBlock',
            attrs: { src: attrs.src },
          })
        },

      // 设置对齐方式
      setImageBlockAlign:
        (align) =>
        ({ commands }) =>
          commands.updateAttributes('imageBlock', { align }),

      // 设置宽度
      setImageBlockWidth:
        (width) =>
        ({ commands }) =>
          commands.updateAttributes('imageBlock', {
            width: `${Math.max(0, Math.min(100, width))}%`,
          }),

      // 设置比例
      setImageBlockRatio:
        (ratio) =>
        ({ commands }) =>
          commands.updateAttributes('imageBlock', {
            ratio,
          }),
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView)
  },
})

export default ImageBlock
