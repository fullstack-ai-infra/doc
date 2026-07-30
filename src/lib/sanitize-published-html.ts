import 'server-only'

import sanitizeHtml from 'sanitize-html'

export const MAX_PUBLISHED_HTML_BYTES = 2 * 1024 * 1024
export const MAX_PUBLISHED_MERMAID_BYTES = 50_000
export const MAX_PUBLISHED_MERMAID_BLOCKS = 100

const percent = /^(?:100|[1-9]?\d(?:\.\d+)?)%$/
const alignment = /^(?:left|right|center|justify)$/
const imageMargin = /^(?:0(?:px)?|auto)(?:\s+(?:0(?:px)?|auto)){0,3}$/
const safeColor =
  /^(?:#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}(?:\.\d+)?(?:\s*,\s*\d{1,3}(?:\.\d+)?){2}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i

export function sanitizePublishedHtml(value: unknown) {
  if (typeof value !== 'string') {
    throw new Error('Published HTML must be a string')
  }
  if (Buffer.byteLength(value, 'utf8') > MAX_PUBLISHED_HTML_BYTES) {
    throw new Error(`Published HTML must not exceed ${MAX_PUBLISHED_HTML_BYTES} bytes`)
  }

  let mermaidBlocks = 0
  let invalidMermaid = false
  const sanitized = sanitizeHtml(value, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'caption',
      'col',
      'colgroup',
      'del',
      'img',
      'input',
      'mark',
      's',
      'u',
    ],
    allowedAttributes: {
      '*': ['class', 'data-*', 'style'],
      a: ['href', 'target', 'rel', 'title'],
      col: ['span', 'width'],
      img: ['src', 'alt', 'title', 'width', 'height', 'data-*'],
      input: ['type', 'checked', 'disabled'],
      ol: ['start', 'type'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan', 'scope'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    allowProtocolRelative: false,
    allowedStyles: {
      '*': {
        'background-color': [safeColor],
        'text-align': [alignment],
      },
      div: {
        margin: [imageMargin],
        width: [percent],
      },
      img: {
        width: [percent],
      },
    },
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: 'a',
        attribs: {
          ...attributes,
          ...(attributes.target === '_blank' ? { rel: 'noopener noreferrer' } : {}),
        },
      }),
      input: (_tagName, attributes) => ({
        tagName: 'input',
        attribs: {
          ...(attributes.checked === undefined ? {} : { checked: '' }),
          disabled: '',
          type: 'checkbox',
        },
      }),
      div: (_tagName, attributes) => {
        if (attributes['data-type'] === 'mermaid-block') {
          mermaidBlocks += 1
          const code = attributes['data-code'] || ''
          if (
            mermaidBlocks > MAX_PUBLISHED_MERMAID_BLOCKS ||
            Buffer.byteLength(code, 'utf8') > MAX_PUBLISHED_MERMAID_BYTES
          ) {
            invalidMermaid = true
          }
        }
        return {
          tagName: 'div',
          attribs: attributes,
        }
      },
    },
  })
  if (invalidMermaid) {
    throw new Error(
      `Published HTML must contain at most ${MAX_PUBLISHED_MERMAID_BLOCKS} Mermaid blocks of ${MAX_PUBLISHED_MERMAID_BYTES} bytes each`
    )
  }
  return sanitized
}
