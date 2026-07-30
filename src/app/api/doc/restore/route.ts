import { z } from 'zod'
import { db } from '@/db/db'
import { getUserInfo } from '@/lib/session'
import { nextSortOrder } from '@/lib/doc-sort-order'
import { genErrorData, genSuccessData, genUnAuthData } from '@/app/api/utils/gen-res-data'

const restoreSchema = z
  .object({
    id: z.string().min(1),
    ids: z.array(z.string().min(1)).min(1),
  })
  .strict()

export async function POST(request: Request) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  const parsed = restoreSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || !parsed.data.ids.includes(parsed.data.id)) {
    return Response.json(genErrorData('Restore payload invalid'))
  }

  try {
    await db.$transaction(async (tx) => {
      const { id, ids } = parsed.data
      const docs = await tx.doc.findMany({
        where: { id: { in: ids }, userId: user.id, isDeleted: true },
        select: { id: true, parentId: true },
      })
      if (docs.length !== new Set(ids).size) throw new Error('Document not found')
      const parentId = docs.find((doc) => doc.id === id)?.parentId ?? null

      const parentExists =
        parentId == null ||
        (await tx.doc.findFirst({
          where: { id: parentId, userId: user.id, isDeleted: false },
          select: { id: true },
        })) != null

      await tx.doc.updateMany({
        where: { id: { in: ids }, userId: user.id },
        data: { isDeleted: false },
      })

      if (!parentExists) {
        const result = await tx.doc.aggregate({
          where: { userId: user.id, parentId: null },
          _max: { sortOrder: true },
        })
        await tx.doc.update({
          where: { id },
          data: { parentId: null, sortOrder: nextSortOrder(result._max.sortOrder) },
        })
      }
    })
    return Response.json(genSuccessData())
  } catch (error) {
    console.error('Restore document error', error)
    return Response.json(genErrorData('Restore document failed'))
  }
}
