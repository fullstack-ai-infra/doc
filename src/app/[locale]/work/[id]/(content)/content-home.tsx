'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { File, Plus, Search, Star, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CONTENT_WIDTH, WORK_CONTENT_CONTAINER_ID } from '@/constants'
import { useDialogStore } from '@/stores/dialog-store'
import { useDocsStore, IDoc } from '@/stores/docs-store'
import { useShareStore, IShareRelationDoc } from '@/stores/share-store'
import useDocs from '../hooks/useDocs'
import { timeAgo } from '@/lib/dt'
import { nav } from '../@directory/util'

export default function ContentHome() {
  const t = useTranslations('contentHome')

  // set web page title
  useEffect(() => {
    document.title = t('title')
  }, [t])

  return (
    <div
      id={WORK_CONTENT_CONTAINER_ID}
      className="bg-background mx-auto my-10"
      style={{ maxWidth: `${CONTENT_WIDTH}px` }}
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <SearchInput />
          <NewButton />
        </div>
      </header>
      <main className="space-y-8">
        <RecentDocsList />
        <FavoriteDocsList />
        <SharedDocsList />
      </main>
    </div>
  )
}

function SearchInput() {
  const t = useTranslations('contentHome')

  // open search dialog when input focus
  const { setSearchDialogOpen } = useDialogStore()
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const elem = inputRef.current
    if (!elem) return
    function fn() {
      setSearchDialogOpen(true)
    }
    elem.addEventListener('focus', fn)
    return () => {
      elem.removeEventListener('focus', fn)
    }
  }, [inputRef, setSearchDialogOpen])

  return (
    <div className="relative flex-grow cursor-pointer">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={t('searchPlaceholder')}
        className="pl-8 w-full cursor-pointer hover:border-gray-400"
        ref={inputRef}
      />
    </div>
  )
}

function NewButton() {
  const t = useTranslations('contentHome')
  const { createDoc } = useDocs()

  return (
    <Button className="w-full sm:w-auto" onClick={() => createDoc()}>
      <Plus className="mr-1 h-4 w-4" />
      {t('newDoc')}
    </Button>
  )
}

function RecentDocsList() {
  const t = useTranslations('contentHome')
  const locale = useLocale()

  const { docs } = useDocsStore()
  const [recentDocs, setRecentDocs] = useState<IDoc[]>([])
  useEffect(() => {
    const recentDocs = docs
      .map((d) => d)
      .sort((d1, d2) => {
        const t1 = d1.updatedAt || d1.createdAt || new Date('1970-01-01')
        const t2 = d2.updatedAt || d2.createdAt || new Date('1970-01-01')
        return t2.getTime() - t1.getTime()
      })
      .slice(0, 8)
    setRecentDocs(recentDocs)
  }, [docs])

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">{t('recentDocs')}</h2>
      {recentDocs.length === 0 && <NotFound />}
      {recentDocs.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {recentDocs.map((doc) => (
            <Card key={doc.id} className="cursor-pointer" onClick={() => nav(doc.id)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium truncate">
                  {doc.icon} {doc.title}
                </CardTitle>
                <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardDescription className="truncate">
                  {timeAgo(doc.updatedAt?.toString() || '', locale === 'zh-cn')}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

function FavoriteDocsList() {
  const t = useTranslations('contentHome')
  const locale = useLocale()

  // open favorite dialog
  const { setFavoriteDialogOpen } = useDialogStore()

  // get favor docs
  const { docs } = useDocsStore()
  const [favorDocs, setFavorDocs] = useState<IDoc[]>([])
  useEffect(() => {
    const favorDocs = docs
      .filter((doc) => doc.isStar)
      .sort((d1, d2) => {
        const t1 = d1.updatedAt || d1.createdAt || new Date('1970-01-01')
        const t2 = d2.updatedAt || d2.createdAt || new Date('1970-01-01')
        return t2.getTime() - t1.getTime()
      })
      .slice(0, 4)
    setFavorDocs(favorDocs)
  }, [docs])

  return (
    <section>
      <div className="flex justify-between">
        <h2 className="text-xl font-semibold mb-4">{t('favorDocs')}</h2>
        <div>
          <Button variant="link" className="text-muted-foreground" onClick={() => setFavoriteDialogOpen(true)}>
            {t('more')}...
          </Button>
        </div>
      </div>
      {favorDocs.length === 0 && <NotFound />}
      {favorDocs.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {favorDocs.map((doc) => (
            <Card key={doc.id} className="cursor-pointer" onClick={() => nav(doc.id)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium truncate">
                  {doc.icon} {doc.title}
                </CardTitle>
                <Star className="h-4 w-4 flex-shrink-0 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <CardDescription className="truncate">
                  {timeAgo(doc.updatedAt?.toString() || '', locale === 'zh-cn')}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

function SharedDocsList() {
  const t = useTranslations('contentHome')
  const locale = useLocale()

  // open shared dialog
  const { setSharedDialogOpen } = useDialogStore()

  // get shared docs
  const myShareRelations = useShareStore((s) => s.myShareRelations)
  const [docs, setDocs] = useState<IShareRelationDoc[]>([])
  useEffect(() => {
    const tempDocs: IShareRelationDoc[] = []
    myShareRelations.forEach((relation) => {
      const doc = relation.doc
      if (tempDocs.some((d) => d.id === doc.id)) return
      tempDocs.push(doc)
    })
    const resDocs = tempDocs
      .sort((d1, d2) => {
        const t1 = d1.updatedAt || d1.createdAt || new Date('1970-01-01')
        const t2 = d2.updatedAt || d2.createdAt || new Date('1970-01-01')
        return t2.getTime() - t1.getTime()
      })
      .slice(0, 4)

    setDocs(resDocs)
  }, [myShareRelations])

  return (
    <section>
      <div className="flex justify-between">
        <h2 className="text-xl font-semibold mb-4">{t('sharedDocs')}</h2>
        <div>
          <Button variant="link" className="text-muted-foreground" onClick={() => setSharedDialogOpen(true)}>
            {t('more')}...
          </Button>
        </div>
      </div>
      {docs.length === 0 && <NotFound />}
      {docs.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {docs.map((doc) => (
            <Card key={doc.id} className="cursor-pointer" onClick={() => nav(doc.id)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium truncate">
                  {doc.icon} {doc.title}
                </CardTitle>
                <Users className="h-4 w-4 flex-shrink-0 text-blue-400" />
              </CardHeader>
              <CardContent>
                <CardDescription className="truncate">
                  {timeAgo(doc.updatedAt?.toString() || '', locale === 'zh-cn')}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

function NotFound() {
  const t = useTranslations('contentHome')
  return <div className="p-8 text-center text-muted-foreground">{t('notFound')}</div>
}
