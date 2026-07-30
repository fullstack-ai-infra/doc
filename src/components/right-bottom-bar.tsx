'use client'

import { useLocale, useTranslations } from 'next-intl'
import { CircleHelp, Clipboard, FileSearch, Keyboard, QrCode, Redo2, Save, Search, Sparkles, Undo2 } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import BackToTop from './back-to-top'

export default function RightBottomBar() {
  const locale = useLocale()

  return (
    <div className="absolute flex flex-col space-y-2 bottom-16 right-8">
      <BackToTop />
      <KeyboardShortcutsButton />
      {locale === 'zh-cn' && (
        <>
          <QRCodeButton />
          <HelpButton />
        </>
      )}
    </div>
  )
}

function KeyboardShortcutsButton() {
  const t = useTranslations('shortcuts')
  const items = [
    { icon: Undo2, label: t('undo'), keys: [['Cmd/Ctrl', 'Z']] },
    {
      icon: Redo2,
      label: t('redo'),
      keys: [
        ['Shift', 'Cmd/Ctrl', 'Z'],
        ['Ctrl', 'Y'],
      ],
    },
    { icon: Save, label: t('saved'), keys: [['Cmd/Ctrl', 'S']] },
    { icon: Clipboard, label: t('paste'), keys: [['Cmd/Ctrl', 'V']] },
    { icon: Sparkles, label: t('aiPanel'), keys: [['Space']] },
    { icon: FileSearch, label: t('search'), keys: [['Cmd/Ctrl', 'K']] },
    { icon: Search, label: t('findReplace'), keys: [['Cmd/Ctrl', 'F']] },
  ]

  return (
    <Dialog>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <Keyboard className="w-4 h-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent align="center">
            <p>{t('tooltip')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="divide-y">{renderShortcutItems(items)}</div>
      </DialogContent>
    </Dialog>
  )
}

function renderShortcutItems(
  items: Array<{
    icon: React.ComponentType<{ className?: string }>
    label: string
    keys: string[][]
  }>
) {
  return items.map((item) => {
    const Icon = item.icon
    return (
      <div key={item.label} className="flex items-center justify-between gap-6 py-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span className="text-foreground">{item.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {item.keys.map((group, groupIndex) => (
            <div key={group.join('-')} className="flex items-center gap-1">
              {group.map((key) => (
                <kbd key={key} className="rounded border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                  {key}
                </kbd>
              ))}
              {groupIndex < item.keys.length - 1 && <span className="text-xs text-muted-foreground">/</span>}
            </div>
          ))}
        </div>
      </div>
    )
  })
}

function HelpButton() {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/join" target="_blank">
            <Button variant="outline" size="icon" className="rounded-full">
              <CircleHelp className="w-4 h-4" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent align="center">
          <p>咨询问题</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function QRCodeButton() {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/join" target="_blank">
            <Button variant="outline" size="icon" className="rounded-full text-green-700 border-green-400">
              <QrCode className="w-4 h-4" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent align="center">
          <p>免费加群</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
