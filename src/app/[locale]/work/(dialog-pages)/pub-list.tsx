'use client'

import { useState } from 'react'
import { ExternalLink, Trash2, Copy, CopyCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useTranslations } from 'next-intl'
import { useDialogStore } from '@/stores/dialog-store'
import { usePubDocsStore } from '@/stores/pub-store'
import { del } from '@/lib/ajax'
import { getPubDocStatusLabel, PUB_DOC_STATUS } from '@/lib/pub-doc-status'

export default function PubDocList() {
  const t = useTranslations('myPubDocList')

  const { pubDocDialogOpen, setPubDocDialogOpen } = useDialogStore()

  return (
    <Dialog open={pubDocDialogOpen} onOpenChange={setPubDocDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start px-2 h-9" variant="ghost">
          <ExternalLink className="h-4 w-4 mr-1" />
          {t('title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <PubDocListContent />
      </DialogContent>
    </Dialog>
  )
}

function PubDocListContent() {
  const t = useTranslations('myPubDocList')

  const pubDocs = usePubDocsStore((s) => s.pubDocs)
  const updatePubDoc = usePubDocsStore((s) => s.updatePubDoc)

  async function handleDelete(publishId: string) {
    if (!confirm(t('deleteConfirm'))) return

    const url = `/api/pub/${publishId}`
    const res = await del(url, {})
    if (res.errno === 0 && res.data) {
      updatePubDoc({
        publishId,
        status: res.data.status,
      })
    }
  }

  return (
    <div className="h-96 flex flex-col overflow-y-auto">
      {pubDocs.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">{t('notFound')}</p>
        </div>
      )}
      {pubDocs.map((p) => (
        <div key={p.publishId} className="flex items-center justify-between px-2 py-2 hover:bg-muted/50 group">
          <div className="flex items-center space-x-2">
            <ExternalLink className="h-4 w-4" />
            <span>{p.title}</span>
            <a href={`/pub/${p.publishId}`} target="_blank" className="underline">
              {p.publishId}
            </a>
            <span
              className={`text-xs ${
                p.status === PUB_DOC_STATUS.PUBLISHED
                  ? 'text-green-600'
                  : p.status === PUB_DOC_STATUS.FROZEN
                    ? 'text-amber-600'
                    : 'text-slate-500'
              }`}
            >
              {getPubDocStatusLabel(p.status)}
            </span>
            <CopyLinkButton publishId={p.publishId} />
          </div>
          <Button variant="ghost" onClick={() => handleDelete(p.publishId)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

function CopyLinkButton({ publishId }: { publishId: string }) {
  const t = useTranslations('myPubDocList')

  const [copied, setCopied] = useState(false)

  async function handleCopyLink() {
    if (copied) return

    const url = `${window.location.origin}/pub/${publishId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 3000)
  }

  return (
    <Button variant="link" onClick={handleCopyLink} className="invisible group-hover:visible">
      {copied ? <CopyCheck className="h-4 w-4 mr-1 text-green-500" /> : <Copy className="h-4 w-4 mr-1" />}
      {copied ? <span className="text-green-500">{t('copySuccess')}</span> : <span>{t('copyLink')}</span>}
    </Button>
  )
}
