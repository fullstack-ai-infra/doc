'use client'

import { post } from '@/lib/ajax'
import { useDocsStore } from '@/stores/docs-store'
import { getDocSnapshot } from './snapshot-provider'
import { DocVersionSnapshot } from './types'

interface RestoreDocVersionInput {
  docId: string
  targetVersionId: string
  currentSnapshot: DocVersionSnapshot
}

// 读取当前正在编辑文档的最新快照，供前端版本动作统一复用。
export function getCurrentDocSnapshot() {
  const { curDocId } = useDocsStore.getState()
  if (!curDocId || curDocId === '0') return null
  return getDocSnapshot(curDocId)
}

// 读取指定文档的最新快照，供文档切换清理阶段保存上一份版本。
export function getDocVersionSnapshot(docId: string) {
  if (!docId || docId === '0') return null
  return getDocSnapshot(docId)
}

// 调用创建版本接口，交给服务端判断是否需要真正落库。
export async function createDocVersion(snapshot: DocVersionSnapshot) {
  const { errno, msg, data } = await post('/api/doc-version', snapshot)
  if (errno !== 0) {
    throw new Error(msg || 'create doc version failed')
  }
  return data
}

// 使用普通异步请求尽力保存当前文档版本，不阻塞后续页面动作。
export async function flushCurrentDocVersion() {
  const snapshot = getCurrentDocSnapshot()
  if (!snapshot) return null
  return await createDocVersion(snapshot)
}

// 按文档 id 尽力保存一份版本快照，适合在文档切换清理阶段调用。
export async function flushDocVersionById(docId: string) {
  const snapshot = getDocVersionSnapshot(docId)
  if (!snapshot) return null
  return await createDocVersion(snapshot)
}

// 在页面卸载阶段通过 sendBeacon 尽力提交当前版本快照。
export function flushCurrentDocVersionByBeacon() {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    return false
  }

  const snapshot = getCurrentDocSnapshot()
  if (!snapshot) return false

  const blob = new Blob([JSON.stringify(snapshot)], {
    type: 'application/json',
  })
  return navigator.sendBeacon('/api/doc-version', blob)
}

// 调用恢复接口，先备份当前快照，再触发服务端执行版本恢复。
export async function restoreDocVersion(input: RestoreDocVersionInput) {
  const { errno, msg, data } = await post('/api/doc-version/restore', input)
  if (errno !== 0) {
    throw new Error(msg || 'restore doc version failed')
  }
  return data
}
