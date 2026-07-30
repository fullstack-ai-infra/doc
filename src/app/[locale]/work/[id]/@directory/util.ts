import emitter from '@/lib/emitter'
import { EVENT_KEY_NAV_DOC } from '@/constants'
import { IDoc } from '@/stores/docs-store'
import { flushCurrentDocVersion } from '@/lib/doc-version/client'

// 判断一个节点，是否是另一个节点的下级
export function isDescendant(id: string, descendantId: string, list: IDoc[]) {
  let curId = descendantId
  while (curId) {
    curId = list.find((i) => i.id === curId)?.parentId || '' // 父节点
    if (curId === id) return true
  }
  return false
}

// 跳转链接 切换文档
export function nav(id: string) {
  const url = `/work/${id}`
  // 切换文档前异步触发一次版本保存，不阻塞后续跳转。
  flushCurrentDocVersion()
  emitter.emit(EVENT_KEY_NAV_DOC, { id })
  history.pushState({ docId: id }, '', url)
}
if (typeof window !== 'undefined') {
  const handlePopState = (event: PopStateEvent) => {
    emitter.emit(EVENT_KEY_NAV_DOC, { id: event.state.docId })
  }
  window.addEventListener('popstate', handlePopState) // 只能绑定一次
}

// 找到所有下级节点
export function getDescendantsIds(id: string, list: IDoc[]) {
  const res: string[] = []

  list.forEach((doc) => {
    const { id: itemId } = doc
    if (isDescendant(id, itemId, list)) res.push(itemId)
  })

  return res
}
