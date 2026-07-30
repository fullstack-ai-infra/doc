const SAFE_TEXT_ALIGNMENTS = new Set(['left', 'center', 'right', 'justify'])
const SAFE_HIGHLIGHT_COLOR = /^(?:#[0-9a-f]{3,8}|red)$/i
const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const SAFE_IMAGE_PROTOCOLS = new Set(['http:', 'https:'])
const SAFE_IMAGE_WIDTH = /^(?:100(?:\.0+)?|(?:0|[1-9]\d?)(?:\.\d+)?)%$/
const SAFE_IMAGE_ALIGNMENTS = new Set(['left', 'center', 'right'])
const SAFE_COLUMN_LAYOUTS = new Set(['sidebar-left', 'sidebar-right', 'two-column'])
const SAFE_COLUMN_POSITIONS = new Set(['left', 'right'])

export const MAX_MERMAID_CODE_CHARACTERS = 50_000

export function safeTextAlignment(value: unknown): string | null {
  return typeof value === 'string' && SAFE_TEXT_ALIGNMENTS.has(value) ? value : null
}

export function safeHighlightColor(value: unknown): string | null {
  return typeof value === 'string' && SAFE_HIGHLIGHT_COLOR.test(value) ? value : null
}

export function safeLinkHref(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048 || /[\u0000-\u001f\u007f]/.test(value)) {
    return null
  }
  if ((value.startsWith('/') && !value.startsWith('//')) || value.startsWith('#')) {
    return value
  }
  try {
    return SAFE_LINK_PROTOCOLS.has(new URL(value).protocol) ? value : null
  } catch {
    return null
  }
}

export function safeImageSource(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 4096 || /[\u0000-\u001f\u007f]/.test(value)) {
    return null
  }

  try {
    return SAFE_IMAGE_PROTOCOLS.has(new URL(value).protocol) ? value : null
  } catch {
    return null
  }
}

export function safeImageWidth(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 16 || !SAFE_IMAGE_WIDTH.test(value)) {
    return null
  }
  const numericWidth = Number(value.slice(0, -1))
  return Number.isFinite(numericWidth) && numericWidth >= 0 && numericWidth <= 100 ? value : null
}

export function safeImageRatio(value: unknown): number | null {
  const ratio =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.length <= 32 && /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)
        ? Number(value)
        : Number.NaN
  return Number.isFinite(ratio) && ratio >= 0.001 && ratio <= 1000 ? ratio : null
}

export function safeImageAlignment(value: unknown): 'left' | 'center' | 'right' | null {
  return typeof value === 'string' && SAFE_IMAGE_ALIGNMENTS.has(value) ? (value as 'left' | 'center' | 'right') : null
}

export function safeColumnLayout(value: unknown): 'sidebar-left' | 'sidebar-right' | 'two-column' | null {
  return typeof value === 'string' && SAFE_COLUMN_LAYOUTS.has(value)
    ? (value as 'sidebar-left' | 'sidebar-right' | 'two-column')
    : null
}

export function safeColumnPosition(value: unknown): 'left' | 'right' | null {
  return typeof value === 'string' && SAFE_COLUMN_POSITIONS.has(value) ? (value as 'left' | 'right') : null
}

export function safeColumnBorder(value: unknown): boolean {
  return typeof value === 'boolean' ? value : true
}

export function safeMermaidCode(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, MAX_MERMAID_CODE_CHARACTERS) : ''
}
