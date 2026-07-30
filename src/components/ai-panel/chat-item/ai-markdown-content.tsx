'use client'

import markdownit from 'markdown-it'
import MermaidPreviewCard from '../mermaid-preview-card'
import { parseMermaidBlocks } from '../parse-mermaid-blocks'

const md = markdownit()

interface AIMarkdownContentProps {
  content: string
}

export default function AIMarkdownContent(props: AIMarkdownContentProps) {
  const { content } = props
  const segments = parseMermaidBlocks(content)

  if (segments.length === 0) return null

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'mermaid') {
          return <MermaidPreviewCard key={`${index}-mermaid`} code={segment.code} />
        }

        return <div key={`${index}-markdown`} dangerouslySetInnerHTML={{ __html: md.render(segment.content) }} />
      })}
    </>
  )
}
