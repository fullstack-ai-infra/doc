const activeDocuments = new Map()

// 记录当前在线文档对应的活动 Y.Doc 实例。
function setActiveDocument(docId, ydoc) {
  activeDocuments.set(docId, ydoc)
}

// 获取当前在线文档对应的活动 Y.Doc 实例。
function getActiveDocument(docId) {
  return activeDocuments.get(docId) || null
}

// 移除当前在线文档对应的活动 Y.Doc 实例。
function removeActiveDocument(docId) {
  activeDocuments.delete(docId)
}

// 判断当前文档是否仍然存在活动房间。
function hasActiveDocument(docId) {
  return activeDocuments.has(docId)
}

module.exports = {
  setActiveDocument,
  getActiveDocument,
  removeActiveDocument,
  hasActiveDocument,
}
