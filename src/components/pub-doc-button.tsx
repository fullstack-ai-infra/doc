'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'
import copy from 'copy-to-clipboard'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { useDocsStore } from '@/stores/docs-store'
import { useEditorStore } from '@/stores/editor-store'
import { usePubDocsStore } from '@/stores/pub-store'
import { get, patch, post } from '@/lib/ajax'
import { getPubDocStatusLabel, PUB_DOC_STATUS } from '@/lib/pub-doc-status'

interface IProps {
  id: string
  disabled?: boolean
  className?: string
}

export default function PubDocButton(props: IProps) {
  const t = useTranslations('pubDoc')
  const { toast } = useToast()

  const { id, className = '', disabled = false } = props
  const curDoc = useDocsStore((s) => s.docs.find((d) => d.id === id))
  const htmlContent = useEditorStore((s) => s.htmlContent)

  // url suffix
  const [urlSuffix, setUrlSuffix] = useState('')
  useEffect(() => {
    setUrlSuffix(id)
  }, [id])
  const isUrlSuffixValid = useMemo(() => /^[a-zA-Z0-9_-]{8,128}$/.test(urlSuffix), [urlSuffix]) // 字母 数字 下划线 横线，8-128 字符
  const url = useMemo(() => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window === 'undefined' ? '' : window.location.origin)
    return `${baseUrl.replace(/\/$/, '')}/pub/${urlSuffix}`
  }, [urlSuffix])

  // copy
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    if (!isUrlSuffixValid) return
    copy(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }

  // get pubDoc by docId
  const pubDocs = usePubDocsStore((s) => s.pubDocs)
  const addPubDoc = usePubDocsStore((s) => s.addPubDoc)
  const updatePubDoc = usePubDocsStore((s) => s.updatePubDoc)
  const curPubDoc = useMemo(() => pubDocs.find((d) => d.docId === id), [pubDocs, id])
  useEffect(() => {
    if (curPubDoc) {
      setUrlSuffix(curPubDoc.publishId)
    }
  }, [curPubDoc, id])

  // publish handler
  const [publishLoading, setPublishTransition] = useTransition()
  function handlePublish() {
    setPublishTransition(async () => {
      if (!isUrlSuffixValid) return
      if (confirm(t('confirmPublish')) === false) return

      // check if urlSuffix is existed
      const checkExistedUrl = `/api/pub/${urlSuffix}`
      const checkExistedRes = await get(checkExistedUrl)
      const { data } = checkExistedRes
      if (data?.exists && data.ownedByCurrentUser === false) {
        return alert(t('urlExist'))
      }
      if (data?.docId != null && data.docId !== id) {
        // 已经存在了
        return alert(t('urlExist'))
      }

      if (!curPubDoc) {
        await newPublish()
      } else {
        await republish()
      }
    })
  }

  // new publish
  async function newPublish() {
    const publishUrl = '/api/pub'
    try {
      const res = await post(publishUrl, {
        publishId: urlSuffix,
        docId: id,
        title: curDoc?.title,
        htmlContent,
      })
      if (res.errno === 0) {
        addPubDoc({
          publishId: urlSuffix,
          docId: id,
          title: curDoc?.title || '',
          status: PUB_DOC_STATUS.PUBLISHED,
          statusReason: null,
        })
        toast({
          description: t('pubSuccess'),
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        description: t('pubFailed'),
      })
    }
  }

  // republish
  async function republish() {
    if (curPubDoc == null) return
    const publishUrl = `/api/pub/${curPubDoc.publishId}`
    try {
      const res = await patch(publishUrl, {
        docId: id,
        title: curDoc?.title,
        htmlContent,
      })
      if (res.errno === 0) {
        updatePubDoc({
          publishId: urlSuffix,
          docId: id,
          title: curDoc?.title || '',
          status: PUB_DOC_STATUS.PUBLISHED,
          statusReason: null,
        })
        toast({
          description: t('pubSuccess'),
        })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        description: t('pubFailed'),
      })
    }
  }

  if (curDoc == null) return null

  const isPublished = curPubDoc?.status === PUB_DOC_STATUS.PUBLISHED
  const isFrozen = curPubDoc?.status === PUB_DOC_STATUS.FROZEN
  const buttonLabel = curPubDoc ? getPubDocStatusLabel(curPubDoc.status) : t('publish')
  const actionLabel =
    curPubDoc == null
      ? t('publish')
      : curPubDoc.status === PUB_DOC_STATUS.PUBLISHED
        ? t('republish')
        : curPubDoc.status === PUB_DOC_STATUS.UNPUBLISHED
          ? '恢复发布'
          : '联系管理员恢复'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          role="pub-button"
          variant={isPublished ? 'secondary' : 'ghost'}
          size="sm"
          className={cn('focus-visible:ring-transparent', className)}
          disabled={disabled}
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          {buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" role="share-content">
        <div className="px-1">
          <h3 className="font-bold mb-2">{t('pubDesc')}</h3>
          {curPubDoc && curPubDoc.status !== PUB_DOC_STATUS.PUBLISHED && (
            <p className="mb-3 text-sm text-amber-600">
              当前状态：{getPubDocStatusLabel(curPubDoc.status)}
              {curPubDoc.statusReason ? `（${curPubDoc.statusReason}）` : ''}
            </p>
          )}
          {isFrozen && (
            <p className="mb-3 text-sm text-slate-500">该发布内容已被冻结，作者端不能直接恢复，请联系管理员处理。</p>
          )}
          <div className="mt-4">
            <p className="text-sm font-bold text-gray-600 my-2">{t('customUrlSuffix')}</p>
            <Input
              value={urlSuffix}
              onChange={(e) => setUrlSuffix(e.target.value)}
              className="w-full"
              disabled={!!curPubDoc}
            />
            {!isUrlSuffixValid && <p className="text-sm text-red-500 my-1">{t('InvalidTip')}</p>}
          </div>
          <div className="mt-4">
            <p className="text-sm font-bold text-gray-600 my-2">{t('URL')}</p>
            <div>
              <code>{url}</code>
              <Button variant="link" className="inline underline" onClick={handleCopy}>
                {copied ? t('copied') : t('copy')}
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Button
              className="w-full"
              disabled={!isUrlSuffixValid || publishLoading || isFrozen}
              onClick={handlePublish}
            >
              {actionLabel}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
