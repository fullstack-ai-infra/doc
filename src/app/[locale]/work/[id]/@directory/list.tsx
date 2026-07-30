'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, ChevronDown, ChevronRight, ArrowDownWideNarrow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import Item from './item'
import emitter from '@/lib/emitter'
import { EVENT_KEY_NAV_DOC } from '@/constants'
import { IDoc, useDocsStore } from '@/stores/docs-store'
import { IPubDoc, usePubDocsStore } from '@/stores/pub-store'
import { compareDocsBySortOrder } from '@/lib/doc-sort-order'
import useDocs from '../hooks/useDocs'
import { useTranslations } from 'next-intl'
import { RootDropZone } from './directory-dnd'

interface ListProps {
  defaultParamId: string
  defaultList: IDoc[]
  defaultPubDocs: IPubDoc[]
}

export default function List({ defaultParamId, defaultList, defaultPubDocs }: ListProps) {
  const t = useTranslations('myDocs')

  const loading = useDocsStore((s) => s.loading)
  const docs = useDocsStore((s) => s.docs)
  const sortBy = useDocsStore((s) => s.sortBy)
  const curDocId = useDocsStore((s) => s.curDocId)
  const setLoading = useDocsStore((s) => s.setLoading)
  const setDocs = useDocsStore((s) => s.setDocs)
  const setCurDocId = useDocsStore((s) => s.setCurDocId)

  const setPubDocs = usePubDocsStore((s) => s.setPubDocs)

  // 切换文档，重新设置 paramId
  useEffect(() => {
    function handler(payload: any) {
      const { id } = payload || {}
      if (!id) return
      setCurDocId(id)
    }
    emitter.on(EVENT_KEY_NAV_DOC, handler)
    return () => {
      emitter.off(EVENT_KEY_NAV_DOC, handler) // 及时清理自定义事件
    }
  })

  useEffect(() => {
    setDocs(defaultList)
    setCurDocId(defaultParamId)
    setLoading(false)
    setPubDocs(defaultPubDocs)
  }, [defaultParamId, defaultList, setDocs, setCurDocId, setLoading, setPubDocs, defaultPubDocs])

  // show or hide list
  const [showChildren, setShowChildren] = useState(false)
  function toggleShowChildren(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    setShowChildren(!showChildren)
  }
  useEffect(() => {
    if (curDocId == '0') setShowChildren(true)
    if (docs.some((i) => i.id === curDocId)) {
      setShowChildren(true)
    }
  }, [curDocId, docs])

  // sort docs
  const sortedDocs = useMemo(() => {
    return [...docs].sort((a, b) => {
      if (sortBy === 'default') return compareDocsBySortOrder(a, b)
      if (sortBy === 'createdAt') {
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      }
      if (sortBy === 'updatedAt') {
        return new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime()
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title)
      }
      return 0
    })
  }, [docs, sortBy])

  if (loading)
    return (
      <div className="space-y-2 px-2 pt-2">
        <Skeleton className="h-6 w-full bg-black/10" />
        <Skeleton className="h-6 w-full bg-black/10" />
        <Skeleton className="h-6 w-full bg-black/10" />
      </div>
    )

  return (
    // <div className="h-[1000px]">
    <>
      <div className="mb-2">
        <div className="flex justify-between items-center">
          <h3
            className="px-1 mt-1 mb-1 text-sm font-bold flex items-center cursor-pointer"
            onClick={toggleShowChildren}
          >
            <div className="hover:bg-active rounded-full p-0.5">
              {showChildren && <ChevronDown className="h-4 w-4" />}
              {!showChildren && <ChevronRight className="h-4 w-4" />}
            </div>
            <span>{t('title')}</span>
          </h3>
          <SortButton />
        </div>

        {showChildren && (
          <>
            <RootDropZone position="first">
              <div className="h-2" />
            </RootDropZone>
            {sortedDocs
              .filter((i) => i.parentId == null) // 顶级目录
              .map((doc) => {
                const { id, title, isStar, icon } = doc
                return (
                  <Item key={id} id={id} icon={icon} title={title} isStar={!!isStar} curDocId={curDocId} docs={docs} />
                )
              })}
            <RootDropZone position="last">
              <div className="h-3" />
            </RootDropZone>
          </>
        )}
      </div>
      {/* create button */}
      <CreateButton />
    </>
  )
}

function SortButton() {
  const t = useTranslations('myDocs')

  const sortBy = useDocsStore((s) => s.sortBy)
  const setSortBy = useDocsStore((s) => s.setSortBy)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('sortByDefault')}
          className="cursor-pointer rounded p-1 hover:bg-active mr-2"
        >
          <ArrowDownWideNarrow className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-1 flex flex-col w-22">
        <Button
          variant={sortBy === 'default' ? 'secondary' : 'ghost'}
          onClick={() => setSortBy('default')}
          size="sm"
          className="focus-visible:ring-transparent"
        >
          {t('sortByDefault')}
        </Button>
        <Button
          variant={sortBy === 'title' ? 'secondary' : 'ghost'}
          onClick={() => setSortBy('title')}
          size="sm"
          className="focus-visible:ring-transparent"
        >
          {t('sortByTitle')}
        </Button>
        <Button
          variant={sortBy === 'createdAt' ? 'secondary' : 'ghost'}
          onClick={() => setSortBy('createdAt')}
          size="sm"
          className="focus-visible:ring-transparent"
        >
          {t('sortByCreatedAt')}
        </Button>
        <Button
          variant={sortBy === 'updatedAt' ? 'secondary' : 'ghost'}
          onClick={() => setSortBy('updatedAt')}
          size="sm"
          className="focus-visible:ring-transparent"
        >
          {t('sortByUpdatedAt')}
        </Button>
      </PopoverContent>
    </Popover>
  )
}

function CreateButton() {
  const t = useTranslations('myDocs')
  const { createDoc } = useDocs()
  return (
    <Button
      className="justify-start px-0.5 font-bold text-sm ml-1"
      size="sm"
      variant="ghost"
      onClick={() => createDoc()}
    >
      <Plus className="h-4 w-4 mr-1" />
      {t('create')}
    </Button>
  )
}
