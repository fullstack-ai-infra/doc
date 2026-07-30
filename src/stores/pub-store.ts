import { create } from 'zustand'
import { PubDocStatusValue } from '@/lib/pub-doc-status'

export interface IPubDoc {
  publishId: string
  docId: string
  title: string
  status: PubDocStatusValue
  statusReason?: string | null
}

export interface IPubDocsState {
  pubDocs: IPubDoc[]
  setPubDocs: (docs: IPubDoc[]) => void
  addPubDoc: (doc: IPubDoc) => void
  removePubDoc: (publishId: string) => void
  updatePubDoc: (doc: Partial<IPubDoc> & Pick<IPubDoc, 'publishId'>) => void
}

export const usePubDocsStore = create<IPubDocsState>((set) => ({
  pubDocs: [],
  setPubDocs: (docs) => set({ pubDocs: docs }),
  addPubDoc: (doc) => set((state) => ({ pubDocs: [...state.pubDocs, doc] })),
  removePubDoc: (publishId) => set((state) => ({ pubDocs: state.pubDocs.filter((i) => i.publishId !== publishId) })),
  updatePubDoc: (doc) =>
    set((state) => ({
      pubDocs: state.pubDocs.map((i) => (i.publishId === doc.publishId ? { ...i, ...doc } : i)),
    })),
}))
