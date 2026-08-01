import * as Y from 'yjs'

const activeDocuments = new Map<string, Y.Doc>()

// 记录当前在线文档对应的活动 Y.Doc 实例。
export function setActiveDocument(docId: string, ydoc: Y.Doc): void {
  activeDocuments.set(docId, ydoc)
}

// 获取当前在线文档对应的活动 Y.Doc 实例。
export function getActiveDocument(docId: string): Y.Doc | null {
  return activeDocuments.get(docId) || null
}

// 移除当前在线文档对应的活动 Y.Doc 实例。
export function removeActiveDocument(docId: string): void {
  activeDocuments.delete(docId)
}

// 判断当前文档是否仍然存在活动房间。
export function hasActiveDocument(docId: string): boolean {
  return activeDocuments.has(docId)
}
