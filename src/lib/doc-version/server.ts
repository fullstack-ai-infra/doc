import 'server-only'

import { db } from '@/db/db'

export interface CreateDocVersionInput {
  docId: string
  userId: string
  title: string
  content: string
  contentBinaryBase64: string
}

interface RestoreDocVersionInput {
  docId: string
  userId: string
  currentSnapshot: {
    docId: string
    title: string
    content: string
    contentBinaryBase64: string
  }
  targetVersion: {
    id: string
    docId: string
    title: string
    contentBinary: Uint8Array | Buffer
  }
}

interface RestoreDocVersionDeps {
  callCollabRestore?: typeof callCollabRestore
  runTransaction?: typeof db.$transaction
  updateDocTitle?: typeof updateDocTitle
}

export type RestoreDocVersionResult =
  | {
      status: 'completed'
      docId: string
      restoredVersionId: string
      recoverySnapshotId: string
      operationId: string
      title: string
      contentRestored: true
      titleUpdated: true
    }
  | {
      status: 'partial'
      stage: 'title'
      errorCode: 'TITLE_UPDATE_FAILED'
      retryable: true
      docId: string
      restoredVersionId: string
      recoverySnapshotId: string
      operationId: string
      title: string
      contentRestored: true
      titleUpdated: false
    }

// 读取指定文档最近一次生成的版本快照。
export async function findLatestDocVersion(docId: string, userId: string) {
  return db.docVersion.findFirst({
    where: { docId, userId },
    orderBy: { createdAt: 'desc' },
  })
}

// 将当前快照写入 DocVersion 表，供后续 diff 与恢复使用。
export async function createDocVersion(input: CreateDocVersionInput) {
  const { docId, userId, title, content, contentBinaryBase64 } = input
  return db.docVersion.create({
    data: {
      docId,
      userId,
      title,
      content,
      contentBinary: Buffer.from(contentBinaryBase64, 'base64'),
    },
  })
}

// 先保留当前快照，再恢复协同正文并同步标题。
export async function restoreDocVersion(
  input: RestoreDocVersionInput,
  deps: RestoreDocVersionDeps = {}
): Promise<RestoreDocVersionResult> {
  const { docId, userId, currentSnapshot, targetVersion } = input
  const restore = deps.callCollabRestore || callCollabRestore
  const runTransaction = deps.runTransaction || db.$transaction.bind(db)
  const updateTitle = deps.updateDocTitle || updateDocTitle
  const targetBinaryBase64 = Buffer.from(targetVersion.contentBinary).toString('base64')

  // Persist the pre-restore state first. If the collaboration call fails or the process exits,
  // users still have a recoverable snapshot of the content that was current when restore began.
  const recoverySnapshot = await runTransaction(async (tx) => {
    return tx.docVersion.create({
      data: {
        docId,
        userId,
        title: currentSnapshot.title,
        content: currentSnapshot.content,
        contentBinary: Buffer.from(currentSnapshot.contentBinaryBase64, 'base64'),
      },
      select: { id: true },
    })
  })

  await restore(docId, targetBinaryBase64)
  // Restoring one document to one immutable target version is state-idempotent. Keep this key
  // stable across retries while returning the distinct recovery snapshot created by each attempt.
  const operationId = `restore:${docId}:${targetVersion.id}`

  try {
    // Setting one deterministic title is idempotent. If this final projection fails, callers get
    // the stable operation and recovery snapshot IDs needed to observe and safely retry.
    await updateTitle(docId, targetVersion.title)
  } catch {
    return {
      status: 'partial',
      stage: 'title',
      errorCode: 'TITLE_UPDATE_FAILED',
      retryable: true,
      docId,
      restoredVersionId: targetVersion.id,
      recoverySnapshotId: recoverySnapshot.id,
      operationId,
      title: targetVersion.title,
      contentRestored: true,
      titleUpdated: false,
    }
  }

  return {
    status: 'completed',
    docId,
    restoredVersionId: targetVersion.id,
    recoverySnapshotId: recoverySnapshot.id,
    operationId,
    title: targetVersion.title,
    contentRestored: true,
    titleUpdated: true,
  }
}

// 查询当前用户在指定文档下可见的版本列表。
export async function listDocVersions(docId: string, userId: string) {
  return db.docVersion.findMany({
    where: {
      docId,
      userId,
    },
    select: {
      id: true,
      docId: true,
      userId: true,
      title: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

// 查询单个版本详情，供右侧差异预览使用。
export async function getDocVersionDetail(id: string, userId: string) {
  return db.docVersion.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
      docId: true,
      userId: true,
      title: true,
      content: true,
      createdAt: true,
    },
  })
}

// 查询恢复所需的目标版本完整正文状态。
export async function getDocVersionRestoreTarget(id: string, userId: string) {
  return db.docVersion.findFirst({
    where: {
      id,
      userId,
    },
    select: {
      id: true,
      docId: true,
      title: true,
      content: true,
      contentBinary: true,
    },
  })
}

// 校验当前用户是否拥有该文档，避免恢复他人文档。
export async function assertOwnDoc(docId: string, userId: string) {
  const doc = await db.doc.findFirst({
    where: {
      id: docId,
      userId,
      isDeleted: false,
    },
    select: {
      id: true,
    },
  })
  return !!doc
}

// 在恢复成功后同步更新文档标题。
export async function updateDocTitle(docId: string, title: string) {
  return db.doc.update({
    where: { id: docId },
    data: { title },
  })
}

// 调用协同服务内部接口，执行正文协同状态恢复。
export async function callCollabRestore(docId: string, contentBinaryBase64: string) {
  const baseUrl = process.env.COLLABORATE_EDIT_HTTP_URL || ''
  const internalKey = process.env.COLLABORATE_INTERNAL_API_KEY || ''
  if (!baseUrl) {
    throw new Error('COLLABORATE_EDIT_HTTP_URL required')
  }
  if (!internalKey) {
    throw new Error('COLLABORATE_INTERNAL_API_KEY required')
  }

  const res = await fetch(`${baseUrl}/collab/documents/${docId}/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-doc-internal-key': internalKey,
    },
    body: JSON.stringify({ contentBinaryBase64 }),
  })

  const data = await res.json()
  if (!res.ok || data.success === false || data.errno === -1) {
    throw new Error(data.msg || 'restore doc by collab server failed')
  }
  return data
}
