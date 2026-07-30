'use client'

import { useState } from 'react'
import { MoveUpRight, FileText, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { post } from '@/lib/ajax'
import { IDoc } from '@/stores/docs-store'
import { isDescendant } from '@/app/[locale]/work/[id]/@directory/util'
import { useTranslations } from 'next-intl'
import { useDocsStore } from '@/stores/docs-store'
import { compareDocsBySortOrder } from '@/lib/doc-sort-order'
import type { DocMoveUpdate } from '@/lib/doc-move'

export default function MoveDocButton(props: { id: string; className?: string }) {
  const { id, className = '' } = props
  const [parentId, setParentId] = useState<null | string>(null)
  const docs = useDocsStore((s) => s.docs)
  const applyMoveUpdates = useDocsStore((s) => s.applyMoveUpdates)
  const { toast } = useToast()
  const t = useTranslations('docItem')

  async function handleClick() {
    if (parentId === '') return // 可以是 null ，但不能是空字符串
    const siblings = docs
      .filter((doc) => doc.parentId === parentId && doc.id !== id && !doc.isDeleted)
      .sort(compareDocsBySortOrder)
    const { errno, msg, data } = await post('/api/doc/move', {
      draggedId: id,
      parentId,
      previousSiblingId: siblings.at(-1)?.id ?? null,
      nextSiblingId: null,
    })
    if (errno !== 0) {
      toast({
        variant: 'destructive',
        description: msg || t('moveFailed'),
      })
      return
    }
    applyMoveUpdates((data?.updates || []) as DocMoveUpdate[])
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className={cn('w-full justify-start p-2 h-8', className)}>
          <MoveUpRight className="w-4 h-4 mr-1" />
          {t('move')}
        </Button>
      </DialogTrigger>
      <DialogContent role="move-content">
        <DialogHeader>
          <DialogTitle>{t('move')}</DialogTitle>
          <DialogDescription>{t('moveDesc')}</DialogDescription>
        </DialogHeader>
        <SelectParentDoc curId={id} onSelectParentId={setParentId} />
        <DialogFooter>
          <Button role="submit-button" onClick={handleClick}>
            {t('move')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SelectParentDoc(props: { curId: string; onSelectParentId: (parentId: string | null) => void }) {
  const { curId, onSelectParentId } = props

  const [selectedId, setSelectedId] = useState<null | string>(null)
  const docs = useDocsStore((s) => s.docs)

  const t = useTranslations('docItem')

  function handleSelect(sid: string | null) {
    setSelectedId(sid)
    onSelectParentId(sid)
  }

  if (docs.length === 0) {
    return (
      <div className="h-80">
        <p className="mt-10 text-center text-muted-foreground">{t('noDocs')}</p>
      </div>
    )
  }

  return (
    <div className="h-80 overflow-y-auto">
      <div
        className={cn(
          'flex items-center cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground py-0.5 px-1',
          selectedId == null ? 'bg-muted font-bold text-foreground' : ''
        )}
        onClick={() => handleSelect(null)}
      >
        {docs.length > 0 && <ChevronDown className="w-4 h-4 mr-1" />}
        {docs.length === 0 && <FileText className="w-4 h-4 mr-1" />}
        <p>{t('root')}</p>
      </div>
      {docs.length > 0 && (
        <div className="ml-3">
          {docs
            .filter((i: IDoc) => i.parentId == null)
            .map((doc: IDoc) => (
              <Item key={doc.id} doc={doc} selectedId={selectedId} list={docs} curId={curId} onSelect={handleSelect} />
            ))}
        </div>
      )}
    </div>
  )
}

function Item(props: {
  doc: IDoc
  selectedId: string | null
  onSelect: (id: string) => void
  list: IDoc[]
  curId: string
  level?: number
}) {
  const { doc, selectedId, list = [], curId, onSelect, level = 1 } = props

  const children = list.filter((i: IDoc) => i.parentId === doc.id)
  const hasChildren = children.length > 0

  const isDescendantDoc = isDescendant(curId, doc.id, list)

  function handleClick() {
    if (doc.id === curId) return // 不能选中自己
    if (isDescendantDoc) return // 不能选中下级
    onSelect(doc.id)
  }

  const t = useTranslations('docItem')

  return (
    <>
      <div
        className={cn(
          'flex items-center cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground py-0.5 px-1',
          curId === doc.id ? 'cursor-not-allowed' : '',
          isDescendantDoc ? 'cursor-not-allowed' : '',
          doc.id === selectedId ? 'bg-muted font-bold text-foreground' : ''
        )}
        data-level={level}
        data-testid={`move-item-${doc.id}`}
        onClick={handleClick}
      >
        {hasChildren && <ChevronDown className="w-4 h-4 mr-1" />}
        {!hasChildren && <FileText className="w-4 h-4 mr-1" />}
        <p className="flex-auto truncate">{doc.title || t('unTitled')}</p>
      </div>
      {hasChildren && (
        <div className="ml-3">
          {children.map((d: IDoc) => (
            <Item
              key={d.id}
              doc={d}
              selectedId={selectedId}
              curId={curId}
              list={list}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </>
  )
}
