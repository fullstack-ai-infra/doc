'use client'

import { useMemo, useState } from 'react'
import { Ellipsis } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import Logo from '@/components/logo-component'
import ChangeTheme from '@/components/change-theme'
import ChangeLocale from '@/components/change-locale'
import ShareDocButton from '@/components/share-doc-button2'
import StarDocButton from '@/components/star-doc-button'
import PubDocButton from '@/components/pub-doc-button'
import DocUpdateStatus from '@/components/doc-update-status'
import AIPanelButton from '@/components/ai-panel-button'
import { Separator } from '@/components/ui/separator'
import DocDeleteButton from '@/components/delete-doc-button'
import DuplicateDocButton from '@/components/duplicate-doc-button'
import MoveDocButton from '@/components/move-doc-button'
import ExportPdfButton from '@/components/export-pdf-button'
import VersionDialog from '@/components/doc-version/version-dialog'
import VersionEntryButton from '@/components/doc-version/version-entry-button'
import { useDocsStore } from '@/stores/docs-store'
import { useUserStore } from '@/stores/user-store'

export default function TopBar() {
  const docs = useDocsStore((s) => s.docs)
  const id = useDocsStore((s) => s.curDocId)
  const doc = useMemo(() => docs.find((d) => d.id === id), [docs, id])
  const userInfo = useUserStore((s) => s.userInfo)

  return (
    <div className="flex text-secondary-foreground px-3 bg-ground pb-1 border-b mt-1">
      <div className="text-start inline-flex items-center">
        <Logo />
        <DocUpdateStatus id={id} />
      </div>
      <div className="flex-1 text-end">
        {/* 后续再拆分组件 */}
        <div className="inline-flex items-center space-x-1">
          {id !== '0' && (
            <>
              <AIPanelButton />
              <StarDocButton id={id} disabled={doc?.userId !== userInfo?.id} />
              <ShareDocButton id={id} disabled={doc?.userId !== userInfo?.id} />
              <PubDocButton id={id} disabled={doc?.userId !== userInfo?.id} />
              <TopBarHandlers id={id} disabled={doc?.userId !== userInfo?.id} />
            </>
          )}
          <ChangeLocale />
          <ChangeTheme />
        </div>
      </div>
    </div>
  )
}

function TopBarHandlers(props: { id: string; disabled?: boolean }) {
  const { id, disabled = false } = props
  const [open, setOpen] = useState(false)

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="mx-2" disabled={disabled}>
            <Ellipsis className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-32 p-1">
          <DuplicateDocButton id={id} />
          <MoveDocButton id={id} />
          <ExportPdfButton id={id} />
          <VersionEntryButton onEntryClick={() => setOpen(false)} />
          <Separator className="my-1" />
          <DocDeleteButton id={id} />
        </PopoverContent>
      </Popover>
      <VersionDialog id={id} />
    </>
  )
}
