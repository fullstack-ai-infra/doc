'use client'

import { useEffect, useState } from 'react'
import { NodePos } from '@tiptap/core'
import { useTranslations } from 'next-intl'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { useGetEditor } from '@/components/editor'
import { cn } from '@/lib/utils'

const LevelToCSSWidthMap = new Map([
  [1, 'w-8'],
  [2, 'w-7'],
  [3, 'w-6'],
])

const LevelToCSSPaddingMap = new Map([
  [1, 'pl-0'],
  [2, 'pl-2'],
  [3, 'pl-4'],
])

function getHeadingLevel(node: NodePos): number {
  return parseInt(node.node.attrs.level, 10)
}

export default function Outline() {
  const t = useTranslations('editor')

  const editor = useGetEditor()
  const [headingNodes, setHeadingNodes] = useState<NodePos[]>([])

  useEffect(() => {
    if (editor == null) return
    const headings = editor.$nodes('heading')
    if (headings == null) return

    const filteredHeadings = headings.filter((nodePos) => {
      const level = getHeadingLevel(nodePos)
      if (level > 3) return false // only show level 1, 2, 3
      return true
    })
    setHeadingNodes(filteredHeadings)
  }, [editor?.state]) // eslint-disable-line

  function clickHeading(node: NodePos) {
    if (editor == null) return
    if (!editor.isEditable) return
    editor.commands.focus(node.pos + node.size - 2)
    editor.commands.scrollIntoView()
  }

  if (headingNodes.length === 0) return null

  return (
    <div className="absolute top-1/2 transform -translate-y-1/2 bg-background right-10">
      <HoverCard openDelay={300}>
        <HoverCardTrigger className="flex flex-col space-y-1 cursor-pointer items-end">
          <span className="text-sm text-gray-500 text-center">{t('titles')}</span>
          {headingNodes.map((nodePos, index) => {
            const level = getHeadingLevel(nodePos)
            const widthClass = LevelToCSSWidthMap.get(level) || ''
            return <div key={index} className={cn('h-1.5 bg-gray-300', widthClass)}></div>
          })}
        </HoverCardTrigger>
        <HoverCardContent className="w-56 max-h-96 overflow-auto bg-background" side="left" sideOffset={10}>
          {headingNodes.map((nodePos, index) => {
            const level = getHeadingLevel(nodePos)
            const paddingClass = LevelToCSSPaddingMap.get(level) || ''
            return (
              <p
                key={index}
                onClick={() => clickHeading(nodePos)}
                className={cn(
                  'text-gray-500 truncate hover:text-foreground',
                  paddingClass,
                  editor?.isEditable && 'cursor-pointer'
                )}
              >
                {nodePos.node.textContent}
              </p>
            )
          })}
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}
