export type AIContentSegment =
  | {
      type: 'markdown'
      content: string
    }
  | {
      type: 'mermaid'
      code: string
    }

const MERMAID_BLOCK_RE = /```mermaid\s*([\s\S]*?)```/gi

export function parseMermaidBlocks(content: string): AIContentSegment[] {
  if (!content) return []

  const segments: AIContentSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = MERMAID_BLOCK_RE.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'markdown',
        content: content.slice(lastIndex, match.index),
      })
    }

    segments.push({
      type: 'mermaid',
      code: match[1].trim(),
    })

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    segments.push({
      type: 'markdown',
      content: content.slice(lastIndex),
    })
  }

  return segments.filter((segment) => {
    if (segment.type === 'mermaid') return segment.code.trim() !== ''
    return segment.content.trim() !== ''
  })
}
