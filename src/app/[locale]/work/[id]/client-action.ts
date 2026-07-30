import debounce from 'lodash.debounce'
import { get, patch } from '@/lib/ajax'

export async function getDoc(id: string) {
  const url = `/api/doc/${id}`
  const { errno, msg, data } = await get(url)
  if (errno !== 0) return null
  return data
}

async function updateDoc(
  id: string,
  data: { title?: string; icon?: string | null; content?: string; isStar?: boolean }
) {
  const url = `/api/doc/${id}`
  const res = await patch(url, data)
  return res
}

export const updateTitle = debounce(async (id: string, title: string) => {
  return await updateDoc(id, { title })
}, 1000)

export const updateIcon = async (id: string, icon: string) => {
  return await updateDoc(id, { icon })
}

export const updateIsStar = async (id: string, isStar: boolean) => {
  return await updateDoc(id, { isStar })
}
