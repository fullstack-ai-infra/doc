'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { File, FileOutput, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/list-item'
import { cn } from '@/lib/utils'
import scrollIntoView from 'scroll-into-view-if-needed'
import { isDescendant, nav } from './util'
import { IDoc, useDocsStore } from '@/stores/docs-store'
import { compareDocsBySortOrder } from '@/lib/doc-sort-order'
import ItemHandlers from './item-handlers'
import useDocs from '../hooks/useDocs'
import { useTranslations } from 'next-intl'
import { useShareStore } from '@/stores/share-store'
import { useDirectoryDragItem } from './directory-dnd'

interface IProps {
  id: string
  icon: string | null
  title: string
  isStar: boolean
  curDocId: string
  docs: IDoc[]
  level?: number
}

export default function Item(props: IProps) {
  const { createDoc } = useDocs()
  const { id, icon, title, docs = [], curDocId, isStar, level = 0 } = props
  const isCurrent = id === curDocId
  const rowRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const sortBy = useDocsStore((s) => s.sortBy)

  const children = docs.filter((i) => i.parentId === id)
  const orderedChildren = sortBy === 'default' ? [...children].sort(compareDocsBySortOrder) : children
  const hasChildren = orderedChildren.length > 0

  const [showChildren, setShowChildren] = useState(hasChildren ? isDescendant(id, curDocId, docs) : false)
  function toggleShowChildren(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    setShowChildren(!showChildren)
  }
  const expandChildren = useCallback(() => setShowChildren(true), [])
  const { instruction, isDragging } = useDirectoryDragItem({
    id,
    docs,
    enabled: sortBy === 'default',
    rowRef,
    handleRef: titleRef,
    hasChildren,
    expanded: showChildren,
    expand: expandChildren,
  })

  // is shared doc
  const myShareRelations = useShareStore((s) => s.myShareRelations)
  const [isShared, setIsShared] = useState(false)
  useEffect(() => {
    const relations = myShareRelations.filter((i) => i.docId === id)
    setIsShared(relations.length > 0)
  }, [myShareRelations, id])

  const t = useTranslations('docItem')

  // 滚动到当前标题
  useEffect(() => {
    if (!isCurrent) return
    if (rowRef.current == null) return
    scrollIntoView(rowRef.current, {
      scrollMode: 'if-needed',
      behavior: 'smooth',
      block: 'center',
    })
  }, [isCurrent])

  // 点击标题
  function onClickTitle() {
    if (isCurrent) return
    nav(id)
  }

  // 新建子节点
  function createDocHandler(parentId: string | null) {
    createDoc({ parentId })
    setShowChildren(true)
  }

  return (
    <div>
      <div
        ref={rowRef}
        data-testid={`directory-item-${id}`}
        data-doc-id={id}
        className={cn(
          'relative text-sm flex justify-between items-center w-full hover:text-secondary-foreground hover:bg-active rounded-sm group mb-0.5 px-1 pl-3',
          isCurrent && 'text-secondary-foreground font-bold bg-active rounded-sm',
          isDragging && 'opacity-50',
          instruction?.operation === 'combine' && !instruction.blocked && 'bg-primary/15 ring-1 ring-primary/30'
        )}
      >
        {/* icon 显示/隐藏 children */}
        {hasChildren && (
          <div
            className="cursor-pointer hover:bg-active rounded-full p-0.5"
            onClick={toggleShowChildren}
            style={{ marginLeft: `${level * 8}px` }}
          >
            {showChildren && <ChevronDown className="h-4 w-4" />}
            {!showChildren && <ChevronRight className="h-4 w-4" />}
          </div>
        )}

        {/* 标题链接 */}
        <div
          ref={titleRef}
          data-testid={`directory-drag-title-${id}`}
          onClick={onClickTitle}
          className={cn(
            'flex-auto overflow-hidden py-1.5 px-0.5 flex items-center',
            sortBy === 'default' ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-pointer'
          )}
        >
          {/* no icon */}
          {!hasChildren && !icon && (
            <div className="w-4 mr-1" style={{ marginLeft: `${level * 8}px` }}>
              {isShared ? <FileOutput className="h-4 w-4" /> : <File className="h-4 w-4" />}
            </div>
          )}

          {/* icon */}
          {!hasChildren && icon && (
            <span className="mr-1 scale-110" style={{ marginLeft: `${level * 8}px` }}>
              {icon}
            </span>
          )}
          {hasChildren && icon && <span className="mr-1 scale-110">{icon}</span>}

          {/* title text */}
          <span className="truncate flex-auto">{title || t('unTitled')}</span>
        </div>

        {/* 操作按钮 */}
        <div className="inline-flex items-center invisible group-hover:visible ml-1 w-6 pr-2">
          <ItemHandlers id={id} />
        </div>

        {/* 创建文档 */}
        <div
          onClick={() => createDocHandler(id)}
          className="cursor-pointer rounded-full p-1 hover:bg-active invisible group-hover:visible"
        >
          <Plus className="h-4 w-4" />
        </div>
        {instruction && instruction.operation !== 'combine' && !instruction.blocked && (
          <DropIndicator instruction={instruction} />
        )}
      </div>

      {/* children */}
      {hasChildren && showChildren && (
        <div>
          {orderedChildren.map((doc) => {
            const { id, title, isStar, icon } = doc
            return (
              <Item
                key={id}
                id={id}
                title={title}
                icon={icon}
                curDocId={curDocId}
                docs={docs}
                isStar={!!isStar}
                level={level + 1}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
