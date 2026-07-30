import { get } from '@/lib/ajax'
import { IDocVersionDetail, IDocVersionListItem } from './types'

// 拉取当前文档的版本列表，用于版本弹窗左侧展示。
export async function fetchDocVersions(docId: string) {
  const { errno, data, msg } = await get(`/api/doc-version?docId=${docId}`)
  if (errno !== 0) {
    throw new Error(msg || 'fetch doc versions failed')
  }
  return (data || []) as IDocVersionListItem[]
}

// 拉取单个版本详情，用于右侧预览区加载标题和正文数据。
export async function fetchDocVersionDetail(id: string) {
  const { errno, data, msg } = await get(`/api/doc-version/${id}`)
  if (errno !== 0) {
    throw new Error(msg || 'fetch doc version detail failed')
  }
  return data as IDocVersionDetail
}
