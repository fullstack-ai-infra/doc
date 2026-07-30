import Highlight from '@tiptap/extension-highlight'
import { safeHighlightColor } from '@/lib/tiptap-attribute-safety'

const SafeHighlight = Highlight.extend({
  addAttributes() {
    if (!this.options.multicolor) return {}

    return {
      color: {
        default: null,
        parseHTML: (element) => safeHighlightColor(element.getAttribute('data-color') || element.style.backgroundColor),
        renderHTML: (attributes) => {
          const color = safeHighlightColor(attributes.color)
          if (!color) return {}
          return {
            'data-color': color,
            style: `background-color: ${color}; color: inherit`,
          }
        },
      },
    }
  },
})

export default SafeHighlight
