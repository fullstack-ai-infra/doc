import { z } from 'zod'
import { getUserInfo } from '@/lib/session'
import { db } from '@/db/db'
import { SORT_ORDER_STEP } from '@/lib/doc-sort-order'
import { genErrorData, genSuccessData, genUnAuthData } from '@/app/api/utils/gen-res-data'
import type { DocMoveUpdate } from '@/lib/doc-move'

const moveSchema = z
  .object({
    draggedId: z.string().min(1),
    parentId: z.string().min(1).nullable(),
    previousSiblingId: z.string().min(1).nullable(),
    nextSiblingId: z.string().min(1).nullable(),
  })
  .strict()

class MoveError extends Error {}

export async function POST(request: Request) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  const parsed = moveSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json(genErrorData('Move payload invalid'))

  try {
    const updates = await db.$transaction(async (tx) => {
      const { draggedId, parentId, previousSiblingId, nextSiblingId } = parsed.data
      const dragged = await tx.doc.findFirst({
        where: { id: draggedId, userId: user.id, isDeleted: false },
        select: { id: true, parentId: true, sortOrder: true },
      })
      if (!dragged) throw new MoveError('Document not found')

      let ancestorId = parentId
      while (ancestorId) {
        if (ancestorId === draggedId) throw new MoveError('Cannot move a document into itself or its descendant')
        const ancestor = await tx.doc.findFirst({
          where: { id: ancestorId, userId: user.id, isDeleted: false },
          select: { parentId: true },
        })
        if (!ancestor) throw new MoveError('Target parent not found')
        ancestorId = ancestor.parentId
      }

      const siblings = await tx.doc.findMany({
        where: { userId: user.id, parentId, isDeleted: false, id: { not: draggedId } },
        select: { id: true, parentId: true, sortOrder: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      })
      const siblingIndex = new Map(siblings.map((sibling, index) => [sibling.id, index]))
      const appendWithoutNeighbors = previousSiblingId == null && nextSiblingId == null && siblings.length > 0
      const previousIndex = appendWithoutNeighbors
        ? siblings.length - 1
        : previousSiblingId == null
          ? -1
          : siblingIndex.get(previousSiblingId)
      const nextIndex = nextSiblingId == null ? siblings.length : siblingIndex.get(nextSiblingId)
      if (previousIndex == null || nextIndex == null) throw new MoveError('Target sibling not found')
      if (previousIndex + 1 !== nextIndex) throw new MoveError('Target siblings are not adjacent')

      const insertIndex = nextIndex
      const previous = siblings[insertIndex - 1]
      const next = siblings[insertIndex]
      let sortOrder = SORT_ORDER_STEP
      let requiresReorder = false

      if (previous && next) {
        sortOrder = Math.floor((previous.sortOrder + next.sortOrder) / 2)
        requiresReorder = sortOrder <= previous.sortOrder
      } else if (previous) {
        sortOrder = previous.sortOrder + SORT_ORDER_STEP
      } else if (next) {
        sortOrder = next.sortOrder - SORT_ORDER_STEP
      }

      if (!requiresReorder) {
        await tx.doc.update({
          where: { id: draggedId },
          data: { parentId, sortOrder },
        })
        return [{ id: draggedId, parentId, sortOrder }]
      }

      const orderedIds = siblings.map((sibling) => sibling.id)
      orderedIds.splice(insertIndex, 0, draggedId)
      const updates: DocMoveUpdate[] = []
      for (const [index, id] of orderedIds.entries()) {
        const newSortOrder = (index + 1) * SORT_ORDER_STEP
        const sibling = siblings.find((item) => item.id === id)
        if (id !== draggedId && sibling?.sortOrder === newSortOrder) continue
        await tx.doc.update({
          where: { id },
          data: id === draggedId ? { parentId, sortOrder: newSortOrder } : { sortOrder: newSortOrder },
        })
        updates.push({ id, parentId, sortOrder: newSortOrder })
      }
      return updates
    })

    return Response.json(genSuccessData({ updates }))
  } catch (error) {
    const message = error instanceof MoveError ? error.message : 'Move document failed'
    if (!(error instanceof MoveError)) console.error('Move document error', error)
    return Response.json(genErrorData(message))
  }
}
