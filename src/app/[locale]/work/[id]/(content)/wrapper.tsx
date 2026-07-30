'use client'

import { useState, useEffect, useMemo } from 'react'
import { User } from 'next-auth'
import { Skeleton } from '@/components/ui/skeleton'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useDocsStore, IDoc } from '@/stores/docs-store'
import { useShareStore, IShareRelationDoc } from '@/stores/share-store'
import { useUserStore } from '@/stores/user-store'
import { CONTENT_WIDTH, WORK_CONTENT_PANEL_ID, WORK_CONTENT_SCROLL_CONTAINER } from '@/constants'
import useDocs from '../hooks/useDocs'
import ContentForMyDoc from './content-for-my-doc'
import ContentForShareDoc from './content-for-share-doc'
import ContentHome from './content-home'
import { useTranslations } from 'next-intl'
import RightBottomBar from '@/components/right-bottom-bar'
import AIPanel from '@/components/ai-panel'
import { useDialogStore } from '@/stores/dialog-store'
interface IProps {
  id: string
  userInfo: User | null
  collabAPIToken: string
}

export default function ContentWrapper(props: IProps) {
  const { userInfo: userInfoProp, id: idProp, collabAPIToken } = props

  // set userInfo
  const userInfo = useUserStore((s) => s.userInfo)
  const setUserInfo = useUserStore((s) => s.setUserInfo)
  useEffect(() => {
    if (userInfoProp) {
      setUserInfo(userInfoProp)
    }
  }, [userInfoProp, setUserInfo])
  // set collabAPIToken
  const setCollabAPIToken = useUserStore((s) => s.setCollabAPIToken)
  useEffect(() => {
    if (collabAPIToken) setCollabAPIToken(collabAPIToken)
  }, [collabAPIToken, setCollabAPIToken])

  // if curDoc is my doc
  const loading = useDocsStore((s) => s.loading)
  const creating = useDocsStore((s) => s.creating)
  const curDocId = useDocsStore((s) => s.curDocId)
  const docs = useDocsStore((s) => s.docs)
  const curDoc = useMemo(() => docs.find((d) => d.id === curDocId), [docs, curDocId])
  const setCurDocId = useDocsStore((s) => s.setCurDocId)
  useEffect(() => {
    setCurDocId(idProp)
  }, [idProp, setCurDocId])

  // if home page
  const [isHome, setIsHome] = useState(false)
  useEffect(() => {
    if (curDocId === '0') {
      setIsHome(true)
    } else {
      setIsHome(false)
    }
  }, [curDocId])

  // if curDoc is shared doc
  const shareRelations = useShareStore((s) => s.shareRelations)
  const [notFound, setNotFound] = useState(false)
  const [shareDoc, setShareDoc] = useState<IShareRelationDoc>()
  useEffect(() => {
    if (loading) return
    if (curDoc != null) return

    const isSharedDoc = shareRelations.some((r) => {
      if (r.docId === curDocId && r.userId === userInfo?.id) {
        setShareDoc(r.doc)
        return true
      }
    })
    if (!isSharedDoc) {
      setNotFound(true)
    } else {
      setNotFound(false)
    }
  }, [curDoc, loading, curDocId, shareRelations, userInfo])

  const { createDoc } = useDocs()

  const t = useTranslations('docItem')

  const AIPanelOpen = useDialogStore((s) => s.AIPanelOpen)

  if (loading || creating || userInfo == null) {
    return (
      <div className="flex">
        <div className="flex-auto flex flex-col space-y-3 mx-auto mt-8" style={{ maxWidth: `${CONTENT_WIDTH}px` }}>
          <Skeleton className="h-12 w-full mb-1" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
        <div className="w-1/5 mt-8 px-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (isHome) {
    return <ContentHome />
  }

  function getContentComponent() {
    if (curDoc) {
      return <ContentForMyDoc />
    } else if (shareDoc) {
      return <ContentForShareDoc />
    }
    return null
  }

  if (curDoc || shareDoc) {
    return (
      <ResizablePanelGroup direction="horizontal" className="flex">
        <ResizablePanel id={WORK_CONTENT_PANEL_ID} defaultSize={80} className="flex-auto relative min-w-[980px]">
          <div
            id={WORK_CONTENT_SCROLL_CONTAINER}
            className="overflow-y-auto"
            style={{ height: 'calc(100vh - 45px - 29px)' }}
          >
            {getContentComponent()}
          </div>
          <RightBottomBar />
        </ResizablePanel>
        {AIPanelOpen && <ResizableHandle />}
        {AIPanelOpen && (
          <ResizablePanel
            defaultSize={20}
            className="flex flex-col items-center justify-center min-w-[180px]"
            style={{ height: 'calc(100vh - 45px - 29px)' }}
          >
            <AIPanel />
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
    )
  }

  if (notFound) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>
          {t('notFound')},&nbsp;
          <span className="underline cursor-pointer" onClick={() => createDoc()}>
            {t('create')}
          </span>
        </p>
      </div>
    )
  }
}
