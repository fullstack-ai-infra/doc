'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Replace, Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface IProps {
  editor: Editor | null
  controller: {
    isOpen: boolean
    replaceMode: boolean
    setReplaceMode: (replaceMode: boolean) => void
    close: () => void
  }
}

export default function FindReplacePanel(props: IProps) {
  const { editor, controller } = props
  const { isOpen, replaceMode, setReplaceMode, close } = controller
  const t = useTranslations('editor')
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [matchCount, setMatchCount] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)

  const isEditable = editor?.isEditable ?? false
  const commandApi = editor?.commands as {
    setSearchTerm?: (term: string) => boolean
    setReplaceTerm?: (term: string) => boolean
    resetIndex?: () => boolean
    nextSearchResult?: () => boolean
    previousSearchResult?: () => boolean
    replace?: () => boolean
    replaceAll?: () => boolean
  }

  // Keep match info in sync with the extension storage.
  useEffect(() => {
    if (!editor) return
    const updateMatches = () => {
      const storage = (editor.storage as any)?.searchAndReplace
      const results = storage?.results ?? []
      const resultIndex = storage?.resultIndex ?? 0
      const safeIndex = resultIndex < 0 ? 0 : resultIndex + 1

      setMatchCount(results.length)
      setCurrentIndex(results.length === 0 ? 0 : Math.min(safeIndex, results.length))
    }

    updateMatches()
    editor.on('transaction', updateMatches)
    return () => {
      editor.off('transaction', updateMatches)
    }
  }, [editor])

  // Update search term in extension and reset index.
  useEffect(() => {
    if (!editor) return
    const commands = editor.commands as typeof commandApi
    if (!commands?.setSearchTerm) return
    commands.setSearchTerm(searchTerm)
    if (commands.resetIndex) {
      commands.resetIndex()
    }
    editor.view.dispatch(editor.state.tr)
  }, [editor, searchTerm])

  // Update replace term in extension.
  useEffect(() => {
    if (!editor) return
    const commands = editor.commands as typeof commandApi
    if (!commands?.setReplaceTerm) return
    commands.setReplaceTerm(replaceTerm)
  }, [editor, replaceTerm])

  // Auto focus search input when panel opens.
  useEffect(() => {
    if (!isOpen) return
    searchInputRef.current?.focus()
    searchInputRef.current?.select()
  }, [isOpen])

  useEffect(() => {
    if (isOpen) return
    setSearchTerm('')
    setReplaceTerm('')
  }, [isOpen])

  function handleClose() {
    close()
    if (editor?.isEditable) {
      editor.commands.focus()
    }
  }

  function scrollCurrentMatchIntoView() {
    if (!editor) return
    requestAnimationFrame(() => {
      const currentMatch = editor.view.dom.querySelector<HTMLElement>('.search-result-current')
      if (!currentMatch) return
      currentMatch.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
  }

  function handleNext() {
    if (!editor || !commandApi?.nextSearchResult) return
    commandApi.nextSearchResult()
    scrollCurrentMatchIntoView()
  }

  function handlePrev() {
    if (!editor || !commandApi?.previousSearchResult) return
    commandApi.previousSearchResult()
    scrollCurrentMatchIntoView()
  }

  function handleReplaceCurrent() {
    if (!editor || !isEditable) return
    // Read extension storage for search state and result ranges.
    const storage = (editor.storage as any)?.searchAndReplace
    const results = storage?.results ?? []
    const resultIndex = storage?.resultIndex ?? 0
    // Use the same search settings the extension relies on.
    const searchTerm = storage?.searchTerm ?? ''
    const caseSensitive = storage?.caseSensitive ?? false
    const currentResult = results[resultIndex]
    if (!currentResult) return
    // Replace only the active match range.
    const { from, to } = currentResult
    const normalizedSearch = caseSensitive ? searchTerm : searchTerm.toLowerCase()
    const normalizedReplace = caseSensitive ? replaceTerm : replaceTerm.toLowerCase()
    // Decide whether to advance to the next match when the replacement still contains the search term.
    const shouldAdvance = normalizedSearch !== '' && normalizedReplace.includes(normalizedSearch)
    const nextIndex = results[resultIndex + 1] ? resultIndex + 1 : 0
    if (storage) {
      storage.resultIndex = shouldAdvance ? nextIndex : resultIndex
    }
    // Apply the replacement in a single transaction to avoid mismatched dispatch.
    editor.commands.command(({ tr, dispatch }) => {
      tr.insertText(replaceTerm, from, to)
      tr.scrollIntoView()
      if (dispatch) dispatch(tr)
      return true
    })
  }

  function handleReplaceAll() {
    if (!editor || !isEditable || !commandApi?.replaceAll) return
    commandApi.replaceAll()
    editor.commands.scrollIntoView()
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      if (event.shiftKey) {
        handlePrev()
        return
      }
      handleNext()
    }
  }

  if (!editor) return null

  const matchLabel = `${currentIndex}/${matchCount}`
  const canNavigate = matchCount > 0
  const canReplace = replaceMode && isEditable && matchCount > 0

  return (
    <div
      className={cn(
        'absolute right-8 top-12 z-20 w-[420px] rounded-md border bg-background shadow-md',
        isOpen ? 'block' : 'hidden'
      )}
    >
      <div className="flex items-center gap-2 p-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t('findPlaceholder')}
            onKeyDown={handleSearchKeyDown}
            className="py-0 px-1 h-8 pl-7 focus-visible:ring-transparent"
          />
        </div>
        <span className="min-w-[52px] text-right text-xs text-muted-foreground">{matchLabel}</span>
      </div>
      <div className="flex items-center justify-end gap-2 px-2 pb-2">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={handlePrev} disabled={!canNavigate}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent align="center">
              <div className="flex flex-col items-center">
                <span>{t('findPrev')}</span>
                <span className="text-xs text-muted-foreground">{t('findPrevShortcut')}</span>
              </div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={handleNext} disabled={!canNavigate}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent align="center">
              <div className="flex flex-col items-center">
                <span>{t('findNext')}</span>
                <span className="text-xs text-muted-foreground">{t('findNextShortcut')}</span>
              </div>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant={replaceMode ? 'secondary' : 'ghost'}
                onClick={() => setReplaceMode(!replaceMode)}
              >
                <Replace className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent align="center">
              <span>{t('findReplace')}</span>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent align="center">
              <span>{t('findClose')}</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {replaceMode && (
        <div className="border-t px-2 pb-2 pt-2">
          <Input
            value={replaceTerm}
            onChange={(event) => setReplaceTerm(event.target.value)}
            placeholder={t('replacePlaceholder')}
            className="py-0 px-1 h-8 focus-visible:ring-transparent"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={handleReplaceCurrent} disabled={!canReplace}>
              {t('replaceCurrent')}
            </Button>
            <Button size="sm" variant="secondary" onClick={handleReplaceAll} disabled={!canReplace}>
              {t('replaceAll')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
