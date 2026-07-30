import { create } from 'zustand'
import { User } from 'next-auth'

export type ICollabUser = User & { clientId: string; avatar: string }

interface IEditorState {
  docId: string
  characterCount: number
  wordCount: number
  collaborativeState: string
  collaborativeUsers: ICollabUser[]
  AITokenLimit: number | null
  textContent: string
  htmlContent?: string
  selectionText: string
  prevText: string // 选取/光标 之前的内容
  headings: any[] // 文档标题和大纲
  setDocId: (id: string) => void
  setCharacterCount: (count: number) => void
  setWordCount: (count: number) => void
  setCollaborativeState: (state: string) => void
  setCollaborativeUsers: (users: ICollabUser[]) => void
  setAITokenLimit: (limit: number | null) => void
  setTextContent: (text: string) => void
  setHtmlContent: (html: string) => void
  setSelectionText: (text: string) => void
  setPrevText: (text: string) => void
  setHeadings: (headings: any[]) => void
}

export const useEditorStore = create<IEditorState>((set) => ({
  docId: '',
  characterCount: 0,
  wordCount: 0,
  collaborativeState: 'connecting',
  collaborativeUsers: [],
  AITokenLimit: null,
  htmlContent: '',
  selectionText: '',
  prevText: '',
  textContent: '',
  headings: [],
  setTextContent: (text) => set({ textContent: text }),
  setSelectionText: (text) => set({ selectionText: text }),
  setAITokenLimit: (limit) => set({ AITokenLimit: limit }),
  setDocId: (id) => set({ docId: id }),
  setCharacterCount: (c) => set({ characterCount: c }),
  setWordCount: (c) => set({ wordCount: c }),
  setCollaborativeState: (s) => set({ collaborativeState: s }),
  setCollaborativeUsers: (u: ICollabUser[]) => set({ collaborativeUsers: u }),
  setHtmlContent: (html) => set({ htmlContent: html }),
  setPrevText: (t) => set({ prevText: t }),
  setHeadings: (headings) => set({ headings: headings }),
}))
