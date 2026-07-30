import React from 'react'
import { EditorState } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'

export interface MenuProps {
  appendTo?: React.RefObject<any>
}

export interface ShouldShowProps {
  view: EditorView
  state?: EditorState
  oldState?: EditorState
  from?: number
  to?: number
}
