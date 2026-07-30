import { z } from 'zod'
import { getUserInfo } from '@/lib/session'
import { db } from '@/db/db'
import { genSuccessData, genErrorData, genUnAuthData } from '@/app/api/utils/gen-res-data'
import { sendEmail } from '@/lib/mailer'

const updateDocSchema = z
  .object({
    title: z.string().optional(),
    icon: z.string().nullable().optional(),
    content: z.string().optional(),
    isStar: z.boolean().optional(),
  })
  .strict()

// 获取单个 doc 内容
export async function GET(request: Request, { params }: { params: { id: string } }) {
  // const user = await getUserInfo()
  // if (user == null) return Response.json(genUnAuthData())

  const { id } = params

  try {
    const doc = await db.doc.findUnique({
      where: { id, isDeleted: false }, // 不能加 userId 条件，否则分享文档会获取失败
    })
    if (doc == null) {
      return Response.json(genErrorData('Doc not found'))
    }
    return Response.json(genSuccessData(doc))
  } catch (ex: any) {
    console.error('Get doc error', ex)
    sendEmail({ subject: 'Get doc error', text: ex.message || 'error' })
    return Response.json(genErrorData('Get doc error 获取文档错误'))
  }
}

// 更新单个 doc 内容
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  const { id } = params
  const parsed = updateDocSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json(genErrorData('Update payload invalid'))
  try {
    await db.doc.update({
      where: { id, userId: user.id, isDeleted: false },
      data: parsed.data,
    })
    return Response.json(genSuccessData())
  } catch (ex: any) {
    console.error('Update doc error', ex)
    sendEmail({ subject: 'Update doc error', text: ex.message || 'error' })
    return Response.json(genErrorData('Update doc error 更新失败'))
  }
}
