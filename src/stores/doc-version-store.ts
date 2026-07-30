import { create } from 'zustand'

interface IDocVersionState {
  open: boolean
  selectedVersionId: string
  setOpen: (open: boolean) => void
  setSelectedVersionId: (id: string) => void
}

export const useDocVersionStore = create<IDocVersionState>((set) => ({
  open: false,
  selectedVersionId: '',
  setOpen: (open) => set({ open }),
  setSelectedVersionId: (selectedVersionId) => set({ selectedVersionId }),
}))
