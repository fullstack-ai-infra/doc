import { db } from '@/db/db'
import { genSuccessData, genErrorData, genUnAuthData } from '@/app/api/utils/gen-res-data'

export async function POST(request: Request) {
  try {
    const firstDoc = await db.doc.findFirst({
      where: { isDeleted: false },
      orderBy: {
        updatedAt: 'desc',
      },
      select: { id: true, title: true },
    })
    if (firstDoc) {
      if (firstDoc.id) {
        firstDoc.id = firstDoc.id.slice(0, 8) + '*******' // 隐藏部分 id
      }
      if (firstDoc.title) {
        firstDoc.title = firstDoc.title.slice(0, 5) + '*******' // 隐藏部分 title
      }
    }
    return Response.json(genSuccessData(firstDoc))
  } catch (err: any) {
    return Response.json(genErrorData(err.message || 'error'))
  }
}
