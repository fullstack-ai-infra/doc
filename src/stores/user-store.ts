import { create } from 'zustand'
import { User } from 'next-auth'

interface IUserState {
  userInfo: User | null
  setUserInfo: (user: User) => void
  collabAPIToken: string
  setCollabAPIToken: (collabAPIToken: string) => void
}

export const useUserStore = create<IUserState>((set) => ({
  userInfo: null,
  setUserInfo: (userInfo) => set({ userInfo }),
  collabAPIToken: '',
  setCollabAPIToken: (collabAPIToken) => set({ collabAPIToken }),
}))
