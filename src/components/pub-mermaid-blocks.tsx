'use client'

import { useEffect } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'default',
})

export default function PubMermaidBlocks() {
  useEffect(() => {
    // Mermaid blocks are saved as HTML placeholders by Tiptap, so the public page renders them after hydration.
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('div[data-type="mermaid-block"][data-code]'))

    blocks.forEach((block, index) => {
      const code = block.getAttribute('data-code')?.trim()
      if (!code || block.dataset.rendered === 'true') return

      block.dataset.rendered = 'true'
      block.classList.add('my-4', 'overflow-auto', 'rounded', 'border', 'bg-white', 'p-4', 'dark:bg-gray-950')

      const render = async () => {
        try {
          const result = await mermaid.render(`pub-mermaid-${index}-${Date.now()}`, code)
          block.innerHTML = result.svg
          block.querySelector('svg')?.classList.add('mx-auto', 'max-w-full')
        } catch (error) {
          block.classList.add('border-red-200', 'bg-red-50', 'text-red-700')
          block.textContent = error instanceof Error ? error.message : 'Mermaid render failed'
        }
      }

      void render()
    })
  }, [])

  return null
}
