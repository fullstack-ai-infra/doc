'use client'

import { useRef, useEffect, useState, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { EditorContent, Editor } from '@tiptap/react'
import { Skeleton } from '@/components/ui/skeleton'
import ContentMenu from './menus/content-menu'
import TextMenu from './menus/text-menu'
import ColumnsMenu from './menus/columns-menu'
import LinkMenu from './menus/link-menu'
import ImageBlockMenu from './menus/image-block-menu'
import { TableRowMenu, TableColMenu } from './menus/table-menu'
import FindReplacePanel from './find-replace-panel'
import {
  WORK_CONTENT_SCROLL_CONTAINER,
  WORK_CONTENT_PANEL_ID,
  EVENT_SET_EDITOR_READONLY,
  EVENT_SET_EDITOR_EDITABLE,
  EVENT_KEY_FOCUS_AI,
  EVENT_KEY_FOCUS_EDITOR,
  EVENT_KEY_INSERT_TO_EDITOR,
  EVENT_KEY_REPLACE_EDITOR_SEL_CONTENT,
} from '@/constants'
import useCreateEditor from './hooks/useCreateEditor'
import useFindReplacePanel from './hooks/useFindReplacePanel'
import useLimitCharCount from './hooks/useLimitCharCount'
import useCollabStateAndUsers from './hooks/useCollabStateAndUsers'
import useFocusEditorFromTitleInput from './hooks/useFocusEditorFromTitleInput'
import useGlobalShortcuts from '@/app/[locale]/work/hooks/useGlobalShortcuts'
import DocTemplate from './doc-template'
import Outline from './outline'
import { useToast } from '@/components/ui/use-toast'
import { useTranslations } from 'next-intl'
import emitter from '@/lib/emitter'
import { useEditorStore } from '@/stores/editor-store'
import { useDialogStore } from '@/stores/dialog-store'

export const EditorContext = createContext<Editor | null>(null)

export const useGetEditor = () => {
  return useContext(EditorContext)
}

interface IProps {
  id: string
  readonly?: boolean
}

const TiptapEditor = (props: IProps) => {
  const { id, readonly = false } = props
  const t = useTranslations('editor')

  const menuContainerRef = useRef(null)

  const enableFindReplace = !readonly
  const { editor, loading, provider, isConnectedTimeout, isDisconnected } = useCreateEditor(id)

  const { toast } = useToast()

  // limit character count
  useLimitCharCount(editor)

  // collaborative state and users
  useCollabStateAndUsers(editor, provider)

  // focus editor from title input
  useFocusEditorFromTitleInput(editor)

  const findReplaceController = useFindReplacePanel({
    editor,
    enabled: enableFindReplace,
  })
  useGlobalShortcuts({
    editor,
    enableFindReplace,
    findReplaceController,
  })

  // doc content container elem
  const [contentScrollPanelDiv, setContentScrollPanelDiv] = useState<HTMLElement | null>(null)
  const [workContentPanelDiv, setWorkContentPanelDiv] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setContentScrollPanelDiv(document.getElementById(WORK_CONTENT_SCROLL_CONTAINER))
    setWorkContentPanelDiv(document.getElementById(WORK_CONTENT_PANEL_ID))
  }, [])

  // read-only mode
  useEffect(() => {
    if (editor && readonly === true) {
      editor.setEditable(false)
    }

    // Event: set editor readonly or editable
    function setEditorReadonly() {
      if (readonly === true) return
      editor?.setEditable(false)
    }
    function setEditorEditable() {
      if (readonly === true) return
      editor?.setEditable(true)
    }
    emitter.on(EVENT_SET_EDITOR_READONLY, setEditorReadonly)
    emitter.on(EVENT_SET_EDITOR_EDITABLE, setEditorEditable)
    return () => {
      emitter.off(EVENT_SET_EDITOR_READONLY, setEditorReadonly)
      emitter.off(EVENT_SET_EDITOR_EDITABLE, setEditorEditable)
    }
  }, [readonly, editor])

  // 监听空格输入，focus AI input
  const AIPanelOpen = useDialogStore((s) => s.AIPanelOpen)
  const setAIPanelOpen = useDialogStore((s) => s.setAIPanelOpen)
  useEffect(() => {
    if (editor == null) return
    function fn(event: KeyboardEvent) {
      if (event.key !== ' ') return
      if (editor == null) return
      const selection = editor.state.selection
      if (!selection.empty) return

      if (['codeBlock'].some((type) => editor.isActive(type))) return

      const node = selection.$anchor.node()
      if (node && node.isTextblock && node.textContent.trim() === '') {
        event.preventDefault()
        if (AIPanelOpen) {
          emitter.emit(EVENT_KEY_FOCUS_AI)
        } else {
          setAIPanelOpen(true)
          setTimeout(() => {
            emitter.emit(EVENT_KEY_FOCUS_AI)
          }, 500)
        }
      }
    }
    editor.view.dom.addEventListener('keydown', fn)
    return () => editor.view.dom.removeEventListener('keydown', fn)
  }, [editor, AIPanelOpen, setAIPanelOpen])

  // focus editor
  useEffect(() => {
    function focusEditor() {
      editor?.commands.focus()
    }
    emitter.on(EVENT_KEY_FOCUS_EDITOR, focusEditor)
    return () => {
      emitter.off(EVENT_KEY_FOCUS_EDITOR, focusEditor)
    }
  }, [editor])

  // insert to editor
  useEffect(() => {
    function fn(content: any) {
      if (editor == null) return
      const { to } = editor.state.selection
      editor.commands.focus(to)
      editor.commands.enter()
      editor.commands.insertContent(content)
      editor.commands.scrollIntoView()
    }
    emitter.on(EVENT_KEY_INSERT_TO_EDITOR, fn)
    return () => {
      emitter.off(EVENT_KEY_INSERT_TO_EDITOR, fn)
    }
  }, [editor])

  // replace editor selection content
  useEffect(() => {
    function fn(content: any) {
      if (editor == null) return
      editor.commands.insertContent(content)
      editor.commands.scrollIntoView()
    }
    emitter.on(EVENT_KEY_REPLACE_EDITOR_SEL_CONTENT, fn)
    return () => {
      emitter.off(EVENT_KEY_REPLACE_EDITOR_SEL_CONTENT, fn)
    }
  }, [editor])

  // update editor selection text
  const setSelectionText = useEditorStore((state) => state.setSelectionText)
  const setPrevText = useEditorStore((state) => state.setPrevText)
  useEffect(() => {
    if (editor == null) return
    const fn = () => {
      const selection = editor.state.selection
      let prevText = editor.view.state.doc.textBetween(0, selection.head)
      setPrevText(prevText)

      const { empty, from, to } = selection
      if (empty) {
        setSelectionText('')
      } else {
        let selectedText = editor.state.doc.textBetween(from, to)
        setSelectionText(selectedText)
      }
    }
    editor.on('selectionUpdate', fn)
    return () => {
      editor.off('selectionUpdate', fn) // remove event listener in time
    }
  }, [editor, setSelectionText, setPrevText]) // eslint-disable-line react-hooks/exhaustive-deps

  // if editor empty
  const [isEditorEmpty, setIsEditorEmpty] = useState(false)
  useEffect(() => {
    if (!editor) return
    setIsEditorEmpty(editor.isEmpty)
  }, [editor?.state]) // eslint-disable-line

  // disconnected alert
  useEffect(() => {
    let toastRes: any
    if (isDisconnected) {
      toastRes = toast({
        variant: 'destructive',
        description: t('collabConnFailed'),
      })
    } else {
      if (toastRes && toastRes.dismiss) toastRes.dismiss()
    }
  }, [isDisconnected, toast, t])

  if (isConnectedTimeout) {
    return (
      <div className="mx-10">
        <p className="text-sm text-muted-foreground">{t('collabConnFailed')}</p>
      </div>
    )
  }

  if (!contentScrollPanelDiv || contentScrollPanelDiv.parentElement == null) return null

  if (loading) {
    return (
      <div className="space-y-2 mx-10">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
      </div>
    )
  }

  return (
    <EditorContext.Provider value={editor}>
      {isDisconnected && <div className="mx-10 mb-6 text-red-500">{t('collabConnFailed')}</div>}
      {enableFindReplace &&
        workContentPanelDiv &&
        createPortal(<FindReplacePanel editor={editor} controller={findReplaceController} />, workContentPanelDiv)}
      <div ref={menuContainerRef}>
        <EditorContent editor={editor} />
        <ContentMenu />
        <TextMenu />
        <ColumnsMenu appendTo={menuContainerRef} />
        <LinkMenu appendTo={menuContainerRef} />
        <ImageBlockMenu appendTo={menuContainerRef} />
        <TableRowMenu appendTo={menuContainerRef} />
        <TableColMenu appendTo={menuContainerRef} />
      </div>
      <Outline />
      {isEditorEmpty && !readonly && createPortal(<DocTemplate />, contentScrollPanelDiv.parentElement)}
    </EditorContext.Provider>
  )
}

export default TiptapEditor
