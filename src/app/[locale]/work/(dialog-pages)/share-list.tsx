'use client'

import { useState, useEffect } from 'react'
import { FileOutput, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useShareStore, IShareRelationDoc } from '@/stores/share-store'
import { useTranslations } from 'next-intl'
import { useDialogStore } from '@/stores/dialog-store'

export default function ShareList() {
  const { sharedDialogOpen, setSharedDialogOpen } = useDialogStore()
  const t = useTranslations('MyShareList')
  return (
    <Dialog open={sharedDialogOpen} onOpenChange={setSharedDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full justify-start px-2 h-9" variant="ghost">
          <Users className="h-4 w-4 mr-1" />
          {t('title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <ShareListContent />
      </DialogContent>
    </Dialog>
  )
}

function ShareListContent() {
  const t = useTranslations('MyShareList')

  // get docs
  const myShareRelations = useShareStore((s) => s.myShareRelations)
  const [docs, setDocs] = useState<IShareRelationDoc[]>([])
  useEffect(() => {
    const tempDocs: IShareRelationDoc[] = []
    myShareRelations.forEach((relation) => {
      const doc = relation.doc
      if (tempDocs.some((d) => d.id === doc.id)) return
      tempDocs.push(doc)
    })
    setDocs(tempDocs)
  }, [myShareRelations])

  // 点击，跳转
  function handleClick(doc: IShareRelationDoc) {
    const { id } = doc
    location.href = `/work/${id}`
  }

  return (
    <div className="h-96 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        {docs.length > 0 && (
          <div className="mt-4">
            {docs.map((doc: IShareRelationDoc) => {
              return (
                <div
                  key={doc.id}
                  onClick={() => handleClick(doc)}
                  className="flex items-center text-muted-foreground hover:bg-muted text-lg p-1 cursor-pointer"
                >
                  <FileOutput className="h-4 w-4 mr-1" />
                  <p className="flex-auto truncate">{doc.title}</p>
                </div>
              )
            })}
          </div>
        )}
        {docs.length === 0 && (
          <div className="h-96">
            <p className="mt-10 text-center text-muted-foreground">{t('notFound')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
