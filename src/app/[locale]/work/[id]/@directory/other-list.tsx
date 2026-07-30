'use client'

import { useEffect, useState, useRef } from 'react'
import { ChevronDown, ChevronRight, FileInput } from 'lucide-react'
import { useShareStore, IShareRelation, IShareRelationUser, IShareRelationDoc } from '@/stores/share-store'
import { useDocsStore } from '@/stores/docs-store'
import { useTranslations } from 'next-intl'
import scrollIntoView from 'scroll-into-view-if-needed'
import { nav } from './util'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface IProps {
  defaultShareRelations: IShareRelation[]
  defaultMyShareRelations: IShareRelation[]
}

export default function OtherList(props: IProps) {
  const t = useTranslations('othersDocs')

  // set default share relations
  const { defaultShareRelations, defaultMyShareRelations } = props
  const setShareRelations = useShareStore((state) => state.setShareRelations)
  const shareRelations = useShareStore((state) => state.shareRelations)
  const setMyShareRelations = useShareStore((state) => state.setMyShareRelations)
  useEffect(() => {
    setShareRelations(defaultShareRelations.filter((i) => i.doc.isDeleted !== true))
    setMyShareRelations(defaultMyShareRelations.filter((i) => i.doc.isDeleted !== true))
  }, [defaultShareRelations, setShareRelations, defaultMyShareRelations, setMyShareRelations])

  // calculate notice count
  const [noticeCount, setNoticeCount] = useState(0)
  useEffect(() => {
    const count = shareRelations.filter((i) => i.noticeType !== 'NONE').length
    setNoticeCount(count)
  }, [shareRelations])

  // authors
  const [authors, setAuthors] = useState<IShareRelationUser[]>([])
  useEffect(() => {
    const authors: IShareRelationUser[] = []
    shareRelations.forEach((s) => {
      if (s.author == null) return
      if (authors.some((i) => i.id === s.author?.id)) return
      authors.push(s.author)
    })
    setAuthors(authors)
  }, [shareRelations])

  // show or hide list
  const [showChildren, setShowChildren] = useState(false)
  function toggleShowChildren(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    setShowChildren(!showChildren)
  }
  const curDocId = useDocsStore((s) => s.curDocId)
  useEffect(() => {
    if (shareRelations.some((i) => i.docId === curDocId)) {
      setShowChildren(true)
    }
  }, [curDocId, shareRelations])

  if (shareRelations.length === 0) return null

  return (
    <div className="mb-4">
      <div className="px-1 mt-3 mb-1 text-sm font-bold flex items-center cursor-pointer" onClick={toggleShowChildren}>
        <div className="hover:bg-active rounded-full p-0.5">
          {showChildren && <ChevronDown className="h-4 w-4" />}
          {!showChildren && <ChevronRight className="h-4 w-4" />}
        </div>
        <div>
          <span>{t('title')}</span>
          {noticeCount > 0 && (
            <Badge variant="outline" className="bg-red-300 ml-1 px-1.5">
              {noticeCount}
            </Badge>
          )}
        </div>
      </div>
      {showChildren && authors.map((author) => <AuthorList key={author.id} author={author} />)}
    </div>
  )
}

type ShareRelationDocAndNoticeType = IShareRelationDoc & { noticeType: string }

function AuthorList({ author }: { author: IShareRelationUser }) {
  // get docs of current author
  const [authorDocs, setAuthorDocs] = useState<ShareRelationDocAndNoticeType[]>([])
  const shareRelations = useShareStore((state) => state.shareRelations)
  useEffect(() => {
    const docs: ShareRelationDocAndNoticeType[] = []
    shareRelations.forEach((s) => {
      if (s.authorId !== author.id) return
      const doc = { ...s.doc, noticeType: s.noticeType }
      docs.push(doc)
    })
    setAuthorDocs(docs)
  }, [author, shareRelations])

  // calculate notice count
  const [noticeCount, setNoticeCount] = useState(0)
  useEffect(() => {
    const count = shareRelations.filter((i) => i.authorId === author.id && i.noticeType !== 'NONE').length
    setNoticeCount(count)
  }, [shareRelations, author])

  // show or hide list
  const [showChildren, setShowChildren] = useState(false)
  function toggleShowChildren(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation()
    setShowChildren(!showChildren)
  }
  const curDocId = useDocsStore((s) => s.curDocId)
  useEffect(() => {
    if (authorDocs.some((i) => i.id === curDocId)) {
      setShowChildren(true)
    }
  }, [curDocId, authorDocs])

  // return <div>{author.name || author.email}</div>
  return (
    <div>
      <div
        className="text-sm flex-auto overflow-hidden py-1.5 px-1 ml-2 flex items-center cursor-pointer"
        onClick={toggleShowChildren}
      >
        <div className="hover:bg-active rounded-full p-0.5">
          {showChildren && <ChevronDown className="h-4 w-4" />}
          {!showChildren && <ChevronRight className="h-4 w-4" />}
        </div>
        <div className="truncate flex-auto">
          {noticeCount > 0 && (
            <Badge variant="outline" className="bg-red-100 mr-1 px-1.5">
              {noticeCount}
            </Badge>
          )}
          <span>{author.name || author.email}</span>
        </div>
      </div>
      {showChildren && authorDocs.map((d) => <OtherDocItem key={d.id} doc={d} />)}
    </div>
  )
}

function OtherDocItem({ doc }: { doc: ShareRelationDocAndNoticeType }) {
  const { id, title, noticeType, icon } = doc
  const curDocId = useDocsStore((s) => s.curDocId)
  const isCurrent = id === curDocId
  const titleContainerRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('othersDocs')

  // 滚动到当前标题
  useEffect(() => {
    if (!isCurrent) return
    if (titleContainerRef.current == null) return
    scrollIntoView(titleContainerRef.current!, {
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

  return (
    <div
      ref={titleContainerRef}
      className={cn(
        'text-sm flex justify-between items-center w-full hover:text-secondary-foreground hover:bg-active rounded-sm group mb-0.5 px-1 pl-3',
        isCurrent && 'text-secondary-foreground font-bold bg-active rounded-sm'
      )}
    >
      <div
        onClick={onClickTitle}
        className="cursor-pointer flex-auto overflow-hidden py-1.5 px-0.5 ml-2 flex items-center"
      >
        {!icon && <FileInput className="h-4 w-4 mr-1" />}
        <div className="truncate flex-auto">
          {noticeType !== 'NONE' && (
            <Badge variant="outline" className="bg-red-100 mr-1 px-1.5">
              {noticeType}
            </Badge>
          )}
          {icon && <span className="mr-1 scale-110">{icon}</span>}
          <span>{title || t('unTitled')}</span>
        </div>
      </div>
    </div>
  )
}
