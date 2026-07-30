import TextAlign from '@tiptap/extension-text-align'
import { safeTextAlignment } from '@/lib/tiptap-attribute-safety'

const SafeTextAlign = TextAlign.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: this.options.defaultAlignment,
            parseHTML: (element) => safeTextAlignment(element.style.textAlign) || this.options.defaultAlignment,
            renderHTML: (attributes) => {
              const alignment = safeTextAlignment(attributes.textAlign)
              return alignment ? { style: `text-align: ${alignment}` } : {}
            },
          },
        },
      },
    ]
  },
})

export default SafeTextAlign
