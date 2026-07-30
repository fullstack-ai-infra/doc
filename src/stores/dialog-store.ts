import { create } from 'zustand'

interface IDialogState {
  searchDialogOpen: boolean
  setSearchDialogOpen: (searchDialogOpen: boolean) => void
  favoriteDialogOpen: boolean
  setFavoriteDialogOpen: (favoriteDialogOpen: boolean) => void
  sharedDialogOpen: boolean
  setSharedDialogOpen: (sharedDialogOpen: boolean) => void
  pubDocDialogOpen: boolean
  setPubDocDialogOpen: (pubDocDialogOpen: boolean) => void
  trashDialogOpen: boolean
  setTrashDialogOpen: (trashDialogOpen: boolean) => void
  AIPanelOpen: boolean
  setAIPanelOpen: (AIPanelOpen: boolean) => void
}

export const useDialogStore = create<IDialogState>((set) => ({
  searchDialogOpen: false,
  setSearchDialogOpen: (searchDialogOpen) => set({ searchDialogOpen }),
  favoriteDialogOpen: false,
  setFavoriteDialogOpen: (favoriteDialogOpen) => set({ favoriteDialogOpen }),
  sharedDialogOpen: false,
  setSharedDialogOpen: (sharedDialogOpen) => set({ sharedDialogOpen }),
  pubDocDialogOpen: false,
  setPubDocDialogOpen: (pubDocDialogOpen) => set({ pubDocDialogOpen }),
  trashDialogOpen: false,
  setTrashDialogOpen: (trashDialogOpen) => set({ trashDialogOpen }),
  AIPanelOpen: true,
  setAIPanelOpen: (AIPanelOpen) => set({ AIPanelOpen }),
}))
