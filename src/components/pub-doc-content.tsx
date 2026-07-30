'use client'

import PubMermaidBlocks from './pub-mermaid-blocks'

interface PubDocContentProps {
  htmlContent: string
}

export default function PubDocContent(props: PubDocContentProps) {
  const { htmlContent } = props

  return (
    <>
      {/* Published documents store editor.getHTML(); custom Tiptap NodeViews need client hydration below. */}
      <div
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        className="tiptap ProseMirror prose dark:prose-invert focus:outline-none max-w-none"
      ></div>
      {/* Hydrates custom blocks embedded in the published HTML, such as Mermaid diagrams. */}
      <PubMermaidBlocks />
    </>
  )
}
