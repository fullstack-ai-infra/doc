const Y = require('yjs')
const { TiptapTransformer } = require('@hocuspocus/transformer')
const { getActiveDocument } = require('./active-docs')
const { updateDocBinaryAndJson } = require('../db/doc')

// 将 Base64 编码的正文状态还原成 Yjs 二进制数据。
function decodeBinaryFromBase64(base64) {
  if (typeof base64 !== 'string' || base64.trim() === '') {
    throw new Error('contentBinaryBase64 is required')
  }

  return Uint8Array.from(Buffer.from(base64, 'base64'))
}

// 基于二进制状态创建目标版本对应的临时 Y.Doc。
function createTargetYdocFromBinary(binary) {
  const ydoc = new Y.Doc()
  Y.applyUpdate(ydoc, binary)
  return ydoc
}

// 将恢复后的 Y.Doc 转成数据库可存储的 JSON 字符串。
function serializeYdocToJsonString(ydoc) {
  const json = TiptapTransformer.fromYdoc(ydoc, 'default')
  return JSON.stringify(json)
}

// 深拷贝 Yjs XML 节点，显式保留 attrs，避免 clone() 丢失 heading/taskItem 等属性。
function cloneXmlNode(node) {
  if (node instanceof Y.XmlElement) {
    const cloned = new Y.XmlElement(node.nodeName)
    Object.entries(node.getAttributes()).forEach(([key, value]) => {
      cloned.setAttribute(key, value)
    })

    const children = node.toArray().map((child) => cloneXmlNode(child))
    if (children.length > 0) {
      cloned.insert(0, children)
    }

    return cloned
  }

  if (node instanceof Y.XmlText) {
    const cloned = new Y.XmlText()
    Object.entries(node.getAttributes()).forEach(([key, value]) => {
      cloned.setAttribute(key, value)
    })

    const delta = node.toDelta()
    if (delta.length > 0) {
      cloned.applyDelta(delta)
    }

    return cloned
  }

  return node.clone()
}

// 用目标版本正文完整替换当前活动文档的正文内容。
function replaceDocumentContent(activeDoc, targetDoc) {
  const activeFragment = activeDoc.getXmlFragment('default')
  const targetFragment = targetDoc.getXmlFragment('default')

  activeDoc.transact(() => {
    activeFragment.delete(0, activeFragment.length)
    const clonedNodes = targetFragment.toArray().map((node) => cloneXmlNode(node))
    if (clonedNodes.length > 0) {
      activeFragment.insert(0, clonedNodes)
    }
  })
}

// 将恢复后的正文二进制和 JSON 镜像一次性持久化到主库。
async function persistRestoredDocument(docId, binary, jsonStr) {
  const rowCount = await updateDocBinaryAndJson(docId, binary, jsonStr)
  if (rowCount <= 0) {
    throw new Error('Document not found')
  }

  return rowCount
}

// 执行活动房间正文恢复并回写恢复后的数据库状态。
async function restoreActiveDocument(docId, contentBinaryBase64, deps = {}) {
  const getDocument = deps.getActiveDocument || getActiveDocument
  const persistDocument = deps.persistRestoredDocument || persistRestoredDocument
  const activeDoc = getDocument(docId)

  if (!activeDoc) {
    throw new Error('Active document not found')
  }

  const binary = decodeBinaryFromBase64(contentBinaryBase64)
  const targetDoc = createTargetYdocFromBinary(binary)

  replaceDocumentContent(activeDoc, targetDoc)

  const restoredBinary = Y.encodeStateAsUpdate(activeDoc)
  const restoredJsonStr = serializeYdocToJsonString(activeDoc)

  await persistDocument(docId, restoredBinary, restoredJsonStr)

  return {
    docId,
    contentBinary: restoredBinary,
    content: restoredJsonStr,
  }
}

module.exports = {
  cloneXmlNode,
  decodeBinaryFromBase64,
  createTargetYdocFromBinary,
  serializeYdocToJsonString,
  persistRestoredDocument,
  replaceDocumentContent,
  restoreActiveDocument,
}
