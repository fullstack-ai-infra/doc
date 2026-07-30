'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslations } from 'next-intl'

interface ClearChatButtonProps {
  disabled?: boolean
  onConfirm: () => void
}

export default function ClearChatButton({ disabled = false, onConfirm }: ClearChatButtonProps) {
  const t = useTranslations('AIInput')
  const [open, setOpen] = useState(false)

  function handleConfirm() {
    onConfirm()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-1 m-0 h-6 w-6"
                  aria-label={t('clearChat')}
                  disabled={disabled}
                >
                  <Trash2 size={16} />
                </Button>
              </DialogTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent align="center">{t('clearChat')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('clearChatConfirmTitle')}</DialogTitle>
          <DialogDescription>{t('clearChatConfirmDesc')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('cancel')}</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleConfirm}>
            {t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
