'use client'

import { useCallback, useState } from 'react'
import { Editor } from '@tiptap/core'

interface IOptions {
  editor: Editor | null
  enabled: boolean
}

export interface IFindReplaceController {
  isOpen: boolean
  replaceMode: boolean
  openFind: () => void
  close: () => void
  setReplaceMode: (replaceMode: boolean) => void
}

export default function useFindReplacePanel(options: IOptions): IFindReplaceController {
  const { editor, enabled } = options
  const [isOpen, setIsOpen] = useState(false)
  const [replaceMode, setReplaceMode] = useState(false)

  // Open panel and reset to find mode.
  const openFind = useCallback(() => {
    setIsOpen(true)
    setReplaceMode(false)
  }, [])

  // Close panel only, keep editor focus handling outside.
  const close = useCallback(() => setIsOpen(false), [])

  return {
    isOpen,
    replaceMode,
    openFind,
    close,
    setReplaceMode,
  }
}
