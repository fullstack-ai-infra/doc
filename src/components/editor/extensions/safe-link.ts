import { mergeAttributes } from '@tiptap/core'
import Link from '@tiptap/extension-link'
import { safeLinkHref } from '@/lib/tiptap-attribute-safety'

const SafeLink = Link.extend({
  renderHTML({ HTMLAttributes }) {
    const href = safeLinkHref(HTMLAttributes.href) || ''
    const target =
      HTMLAttributes.target === '_self' || HTMLAttributes.target === '_blank' ? HTMLAttributes.target : '_blank'

    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, {
        href,
        target,
        rel: 'noopener noreferrer nofollow',
        class: null,
      }),
      0,
    ]
  },
})

export default SafeLink
