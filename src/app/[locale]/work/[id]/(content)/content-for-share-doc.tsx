'use client'

import { useState, useEffect } from 'react'
import { useUserStore } from '@/stores/user-store'
import { CONTENT_WIDTH, WORK_CONTENT_CONTAINER_ID } from '@/constants'
import { Input } from '@/components/ui/input'
import TiptapEditor from '@/components/editor'
import { useDocsStore } from '@/stores/docs-store'
import { useShareStore, IShareRelationDoc } from '@/stores/share-store'
import { useTranslations } from 'next-intl'
import { patch } from '@/lib/ajax'

export default function ContentForShareDoc() {
  const userInfo = useUserStore((s) => s.userInfo)
  const curDocId = useDocsStore((s) => s.curDocId)
  const shareRelations = useShareStore((s) => s.shareRelations)
  // const isMyDoc = userInfo?.id === doc.userId

  const [doc, setDoc] = useState<IShareRelationDoc | null>(null)
  const [shareRelationId, setShareRelationId] = useState<string | null>(null)
  const [readonly, setReadonly] = useState(false)

  const t = useTranslations('sharedDocPage')

  const [renderEditor, setRenderEditor] = useState(false)
  useEffect(() => {
    setRenderEditor(false)
    setTimeout(() => {
      setRenderEditor(true) // when doc changed, force re-render editor
    }, 100)
  }, [doc])

  useEffect(() => {
    document.title = doc?.title || t('unTitled')
  }, [doc, t])

  const [authority, setAuthority] = useState(false)

  useEffect(() => {
    setAuthority(false)
  }, [curDocId])

  useEffect(() => {
    shareRelations.some((r) => {
      if (r.docId === curDocId && r.userId === userInfo?.id) {
        setShareRelationId(r.id)
        setReadonly(r.access === 'READ')
        setDoc(r.doc)
        setAuthority(true)
        return true
      }
    })
  }, [curDocId, shareRelations, userInfo])

  // update shareRelation noticeType to NONE
  async function updateShareRelationNoticeTypeDB(id: string) {
    try {
      await patch('/api/doc/share-relation', { id, noticeType: 'NONE' })
    } catch (err) {
      console.log('Update share relation noticeType error ', err)
    }
  }
  const updateShareRelationNoticeType = useShareStore((s) => s.updateShareRelationNoticeType)
  useEffect(() => {
    if (shareRelationId == null) return
    updateShareRelationNoticeTypeDB(shareRelationId) // update db
    updateShareRelationNoticeType(shareRelationId, 'NONE') // update store
  }, [shareRelationId, updateShareRelationNoticeType])

  if (!authority || doc == null) {
    return <p className="mx-10 mt-44 text-center">You have no authority</p>
  }

  const fullWidth = CONTENT_WIDTH + 80 // 两边留白 40px

  return (
    <div
      id={WORK_CONTENT_CONTAINER_ID}
      className={`mx-auto my-12 mb-20 scroll-mt-5`}
      style={{ maxWidth: `${fullWidth}px` }}
    >
      <div className="mx-10 mb-6 flex">
        {doc.icon && (
          <div className="mr-2">
            <span className="text-4xl">{doc.icon}</span>
          </div>
        )}
        <Input
          value={doc.title}
          maxLength={100}
          className="border-none p-0 text-4xl font-bold focus-visible:ring-transparent"
          disabled
        />
        {/* 可能还会再增加其他功能，例如设置 Icon 、背景等 */}
      </div>
      {readonly && <p className="mx-10 my-6 text-sm text-muted-foreground">{t('readonly')}</p>}
      {authority && renderEditor && <TiptapEditor id={doc.id} readonly={readonly} />}
      {/* {authority && <p className="mx-10">editor {doc.id}</p>} */}
    </div>
  )
}
