'use client'

import { useEffect } from 'react'
import { Editor } from '@tiptap/core'
import { useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/use-toast'
import { useDialogStore } from '@/stores/dialog-store'
import { useEditorStore } from '@/stores/editor-store'

interface IOptions {
  editor: Editor | null
  enableFindReplace: boolean
  findReplaceController: {
    isOpen: boolean
    openFind: () => void
    close: () => void
  }
}

export default function useGlobalShortcuts(options: IOptions) {
  const { editor, enableFindReplace, findReplaceController } = options
  const { openFind } = findReplaceController
  const { toast } = useToast()
  const t = useTranslations('shortcuts')
  const setSearchDialogOpen = useDialogStore((s) => s.setSearchDialogOpen)
  const collaborativeState = useEditorStore((s) => s.collaborativeState)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (!isMod) return

      // Handle Ctrl/⌘ + key shortcuts below.
      // Ctrl/⌘+K opens document search dialog.
      if (key === 'k') {
        event.preventDefault()
        setSearchDialogOpen(true)
        return
      }

      // Ctrl/⌘+S shows sync status without saving.
      if (key === 's') {
        event.preventDefault()
        let messageKey = 'saved'
        if (collaborativeState === 'connecting') {
          messageKey = 'savedConnecting'
        } else if (collaborativeState === 'disconnected') {
          messageKey = 'savedDisconnected'
        }
        toast({
          description: t(messageKey),
        })
        return
      }

      // Ctrl/⌘+F opens find/replace when editor is focused.
      if (key === 'f') {
        if (!enableFindReplace || !editor || !editor.isEditable) return
        if (!editor.view.hasFocus()) return
        event.preventDefault()
        openFind()
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [collaborativeState, editor, enableFindReplace, openFind, setSearchDialogOpen, t, toast])
}
