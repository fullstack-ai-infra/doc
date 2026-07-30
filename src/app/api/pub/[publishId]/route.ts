import { db } from '@/db/db'
import { getUserInfo } from '@/lib/session'
import { genSuccessData, genUnAuthData, genErrorData } from '@/app/api/utils/gen-res-data'
import { PUB_DOC_STATUS } from '@/lib/pub-doc-status'

export async function GET(request: Request, { params }: { params: { publishId: string } }) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  const { publishId } = params // `publishId` is publish url suffix
  const p = await db.pubDoc.findUnique({
    where: {
      publishId,
    },
    select: {
      publishId: true,
      docId: true,
      userId: true,
      status: true,
    },
  })

  if (p == null) {
    return Response.json(genSuccessData(null))
  }

  const isOwner = p.userId === user.id

  return Response.json(
    genSuccessData({
      publishId: p.publishId,
      exists: true,
      docId: isOwner ? p.docId : null,
      status: isOwner ? p.status : null,
      ownedByCurrentUser: isOwner,
    })
  )
}

// 更新发布内容
export async function PATCH(request: Request, { params }: { params: { publishId: string } }) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  const { publishId } = params // `publishId` is publish url suffix
  const body = await request.json()
  const { docId, title, htmlContent } = body
  try {
    const current = await db.pubDoc.findUnique({
      where: {
        publishId,
      },
      select: {
        publishId: true,
        userId: true,
        status: true,
      },
    })

    if (current == null) {
      return Response.json(genErrorData('发布记录不存在'))
    }

    if (current.userId !== user.id) {
      return Response.json(genErrorData('无权操作该发布内容'))
    }

    if (current.status === PUB_DOC_STATUS.FROZEN) {
      return Response.json(genErrorData('该发布内容已被冻结，请联系管理员处理'))
    }

    const p = await db.pubDoc.update({
      where: {
        publishId,
      },
      data: {
        title,
        htmlContent,
        docId,
        status: PUB_DOC_STATUS.PUBLISHED,
        statusReason: null,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: user.id || '',
      },
    })
    return Response.json(genSuccessData(p))
  } catch (ex: any) {
    return Response.json(genErrorData(ex.message))
  }
}

// 删除发布内容
export async function DELETE(request: Request, { params }: { params: { publishId: string } }) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  const { publishId } = params
  try {
    const current = await db.pubDoc.findUnique({
      where: {
        publishId,
      },
      select: {
        publishId: true,
        userId: true,
      },
    })

    if (current == null) {
      return Response.json(genErrorData('发布记录不存在'))
    }

    if (current.userId !== user.id) {
      return Response.json(genErrorData('无权操作该发布内容'))
    }

    const p = await db.pubDoc.update({
      where: {
        publishId,
      },
      data: {
        status: PUB_DOC_STATUS.UNPUBLISHED,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: user.id || '',
      },
    })
    return Response.json(genSuccessData(p))
  } catch (ex: any) {
    return Response.json(genErrorData(ex.message))
  }
}
