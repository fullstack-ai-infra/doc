import { db } from '@/db/db'
import { genSuccessData, genErrorData } from '@/app/api/utils/gen-res-data'

export async function PATCH(request: Request, { params }: { params: { publishId: string } }) {
  const { publishId } = params // `publishId` is publish url suffix
  return Response.json(genSuccessData())

  // try {
  //   const p = await db.pubDoc.update({
  //     where: {
  //       publishId,
  //     },
  //     data: {
  //       thumbUpCount: {
  //         decrement: 1, // Decrement the thumb up count by 1
  //       },
  //     },
  //   })
  //   return Response.json(genSuccessData(p))
  // } catch (ex: any) {
  //   return Response.json(genErrorData(ex.message))
  // }
}
