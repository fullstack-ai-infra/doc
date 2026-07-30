import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { getUserInfo } from '@/lib/session'
import { db } from '@/db/db'
import { genSuccessData, genErrorData, genUnAuthData } from '@/app/api/utils/gen-res-data'
import { MAX_DOC_COUNT } from '@/constants'
import { sendEmail } from '@/lib/mailer'
import { getNextSortOrderForParent } from '@/lib/doc-sort-order'

const updateDocsSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1),
    data: z.object({ isDeleted: z.boolean() }).strict(),
  })
  .strict()

// 创建 doc
export async function POST(request: Request) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  // 当前文档数量
  const docCount = await db.doc.count({
    where: {
      userId: user.id,
      isDeleted: false,
    },
  })
  if (docCount > MAX_DOC_COUNT) {
    return Response.json(genErrorData(`You only can create up to ${MAX_DOC_COUNT} docs`))
  }

  const body = await request.json()
  let { originId, id = undefined, title = '', content = '', parentId = null } = body
  let contentBinary = null

  // 从 originId 复制一个
  if (originId) {
    const originDoc = await db.doc.findUnique({
      where: { id: originId },
    })
    if (originDoc == null) {
      return Response.json(genErrorData('Origin doc not found'))
    }

    title = (originDoc.title || 'unTitled') + ' copy'
    content = originDoc.content
    contentBinary = originDoc.contentBinary
    parentId = originDoc.parentId
  }

  // 创建 doc：按复制/新建后的父级重新计算同级末尾 sortOrder
  try {
    const sortOrder = await getNextSortOrderForParent(user.id!, parentId)
    const doc = await db.doc.create({
      data: {
        id,
        title,
        content,
        contentBinary,
        parentId,
        sortOrder,
        userId: user.id!,
      },
    })
    return Response.json(genSuccessData(doc))
  } catch (ex: any) {
    console.error('Create doc error', ex)
    sendEmail({ subject: 'Create doc error', text: ex.message || 'error' })
    return Response.json(genErrorData('Create doc error'))
  }
}

// 更新多个 docs
export async function PATCH(request: Request) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  const parsed = updateDocsSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json(genErrorData('Update payload invalid'))
  const { ids, data } = parsed.data

  try {
    await db.doc.updateMany({
      where: {
        id: { in: ids },
        userId: user.id,
      },
      data,
    })
    return Response.json(genSuccessData())
  } catch (ex) {
    console.error('Delete docs error', ex)
    return Response.json(genErrorData('Delete docs error'))
  }
}

// 获取多个 docs
export async function GET(request: NextRequest) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  const searchParams = request.nextUrl.searchParams

  // 是否软删除
  const isDeletedParam = searchParams.get('isDeleted') // '0' 或 '1'
  let isDeletedFlag: boolean | null = null
  if (isDeletedParam === '0') isDeletedFlag = false
  if (isDeletedParam === '1') isDeletedFlag = true

  // 彻底删除 回收站 30 天之前的文档
  if (isDeletedFlag) {
    await deleteDocsBefore30Days()
  }

  // 是否收藏
  let isStarParam = searchParams.get('isStar') // '0' 或 '1'
  let isStarFlag: boolean | null = null
  if (isStarParam === '0') isStarFlag = false
  if (isStarParam === '1') isStarFlag = true

  // 搜索关键字
  const keyword = searchParams.get('keyword') || null

  // where
  const whereOpt: any = {
    isDeleted: false, // 默认
  }
  if (isDeletedFlag != null) {
    if (isDeletedFlag) {
      whereOpt.isDeleted = true
    } else {
      whereOpt.isDeleted = false
    }
  }
  if (isStarFlag != null) {
    if (isStarFlag) {
      whereOpt.isStar = true
    } else {
      whereOpt.isStar = false
    }
  }
  if (keyword != null) {
    whereOpt.title = {
      contains: keyword,
    }
  }

  const list = await db.doc.findMany({
    select: {
      id: true,
      title: true,
      parentId: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
    },
    where: {
      userId: user.id || '',
      ...whereOpt,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  return Response.json(genSuccessData(list || []))
}

// 删除多个 docs
export async function DELETE(request: NextRequest) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  const body = await request.json()
  const { ids = [] } = body

  try {
    // 真实删除
    await db.doc.deleteMany({
      where: {
        id: { in: ids },
        userId: user.id,
      },
    })
    return Response.json(genSuccessData())
  } catch (ex) {
    console.error('Delete docs error', ex)
    return Response.json(genErrorData('Delete docs error'))
  }
}

// 回收站 30 天之前的文档，彻底删除
async function deleteDocsBefore30Days() {
  const user = await getUserInfo()
  if (user == null) return

  const now = new Date()
  const before30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  await db.doc.deleteMany({
    where: {
      userId: user.id,
      isDeleted: true,
      updatedAt: {
        lt: before30Days,
      },
    },
  })
}
