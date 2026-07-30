import { DocVersionSnapshot } from './types'

type SnapshotGetter = () => DocVersionSnapshot | null

const snapshotProviderMap = new Map<string, SnapshotGetter>()

// 注册指定文档的快照提供器，供版本保存和恢复时读取最新编辑态。
export function registerDocSnapshotProvider(docId: string, getter: SnapshotGetter) {
  snapshotProviderMap.set(docId, getter)
}

// 注销指定文档的快照提供器，避免切换文档后读取到旧实例。
export function unregisterDocSnapshotProvider(docId: string) {
  snapshotProviderMap.delete(docId)
}

// 读取指定文档当前可用的编辑快照，没有可用快照时返回空。
export function getDocSnapshot(docId: string) {
  const getter = snapshotProviderMap.get(docId)
  if (!getter) return null
  return getter()
}
