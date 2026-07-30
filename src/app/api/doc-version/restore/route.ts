import { genErrorData, genSuccessData, genUnAuthData } from '@/app/api/utils/gen-res-data'
import { getUserInfo } from '@/lib/session'
import { assertOwnDoc, getDocVersionRestoreTarget, restoreDocVersion } from '@/lib/doc-version/server'

// 执行版本恢复前备份、正文协同恢复和标题回写。
export async function POST(request: Request) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  try {
    const body = await request.json()
    const { docId = '', targetVersionId = '', currentSnapshot } = body || {}
    if (!docId || !targetVersionId || !currentSnapshot) {
      return Response.json(genErrorData('restore payload invalid'))
    }
    if (currentSnapshot.docId !== docId) {
      return Response.json(genErrorData('Snapshot docId mismatch'))
    }

    const hasDoc = await assertOwnDoc(docId, user.id || '')
    if (!hasDoc) {
      return Response.json(genErrorData('Doc not found'))
    }

    const targetVersion = await getDocVersionRestoreTarget(targetVersionId, user.id || '')
    if (targetVersion == null || targetVersion.docId !== docId) {
      return Response.json(genErrorData('Target version not found'))
    }

    const data = await restoreDocVersion({
      docId,
      userId: user.id || '',
      currentSnapshot: {
        docId,
        title: currentSnapshot.title || '',
        content: currentSnapshot.content || '',
        contentBinaryBase64: currentSnapshot.contentBinaryBase64 || '',
      },
      targetVersion,
    })

    return Response.json(genSuccessData(data))
  } catch (ex) {
    console.error('Restore doc version error', ex)
    return Response.json(genErrorData('Restore doc version error'))
  }
}
