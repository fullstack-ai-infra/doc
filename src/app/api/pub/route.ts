import { getUserInfo } from '@/lib/session'
import { db } from '@/db/db'
import { genSuccessData, genErrorData, genUnAuthData } from '@/app/api/utils/gen-res-data'
import { PUB_DOC_STATUS } from '@/lib/pub-doc-status'

// 新建发布
export async function POST(request: Request) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  const body = await request.json()
  const { publishId, docId, title, htmlContent } = body

  try {
    const publishDoc = await db.pubDoc.create({
      data: {
        publishId,
        title,
        htmlContent,
        docId,
        userId: user.id || '',
        status: PUB_DOC_STATUS.PUBLISHED,
        statusUpdatedBy: user.id || '',
      },
    })
    return Response.json(genSuccessData(publishDoc))
  } catch (ex: any) {
    return Response.json(genErrorData(ex.message))
  }
}
