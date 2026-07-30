import { ReactNodeViewRenderer } from '@tiptap/react'
import { mergeAttributes, Range } from '@tiptap/core'
import { Image as BaseImage } from '@tiptap/extension-image'
import { safeImageAlignment, safeImageRatio, safeImageSource, safeImageWidth } from '@/lib/tiptap-attribute-safety'
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
        parseHTML: (element) => safeImageSource(element.getAttribute('src')) || '',
        renderHTML: (attributes) => {
          const src = safeImageSource(attributes.src)
          return src ? { src } : {}
        },
      },
      width: {
        default: '100%',
        parseHTML: (element) => safeImageWidth(element.getAttribute('data-width')) || '100%',
        renderHTML: (attributes) => ({
          'data-width': safeImageWidth(attributes.width) || '100%',
        }),
      },
      // 宽高比例
      ratio: {
        default: NaN,
        parseHTML: (element) => safeImageRatio(element.getAttribute('data-ratio')) ?? NaN,
        renderHTML: (attributes) => {
          const ratio = safeImageRatio(attributes.ratio)
          return ratio == null ? {} : { 'data-ratio': ratio }
        },
      },
      // 对齐方式
      align: {
        default: 'center',
        parseHTML: (element) => safeImageAlignment(element.getAttribute('data-align')) || 'center',
        renderHTML: (attributes) => ({
          'data-align': safeImageAlignment(attributes.align) || 'center',
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
    const src = safeImageSource(HTMLAttributes.src)
    const width = safeImageWidth(HTMLAttributes['data-width']) || '100%'
    const ratio = safeImageRatio(HTMLAttributes['data-ratio'])
    const align = safeImageAlignment(HTMLAttributes['data-align']) || 'center'
    const alt = typeof HTMLAttributes.alt === 'string' ? HTMLAttributes.alt.slice(0, 1000) : undefined

    return [
      'div',
      {},
      [
        'div',
        {
          style: `width: ${width}; margin: ${genMargin(align)};`,
        },
        [
          'img',
          mergeAttributes(this.options.HTMLAttributes, {
            ...(src ? { src } : {}),
            'data-width': width,
            ...(ratio == null ? {} : { 'data-ratio': ratio }),
            'data-align': align,
            ...(alt === undefined ? {} : { alt }),
          }),
        ],
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
