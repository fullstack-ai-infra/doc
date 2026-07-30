import 'server-only'

import type { AccessType } from '@prisma/client'
import { db } from '@/db/db'

export const DOCUMENT_ACCESS = {
  OWNER: 'OWNER',
  WRITE: 'WRITE',
  READ: 'READ',
  NONE: 'NONE',
} as const

export type DocumentAccess = (typeof DOCUMENT_ACCESS)[keyof typeof DOCUMENT_ACCESS]

type DocumentAccessRecord = {
  userId: string
  shareRelations: Array<{ access: AccessType; authorId: string }>
}

export function resolveDocumentAccess(record: DocumentAccessRecord | null, userId: string): DocumentAccess {
  if (record == null) return DOCUMENT_ACCESS.NONE
  if (record.userId === userId) return DOCUMENT_ACCESS.OWNER

  const validRelations = record.shareRelations.filter((relation) => relation.authorId === record.userId)
  if (validRelations.some((relation) => relation.access === DOCUMENT_ACCESS.WRITE)) {
    return DOCUMENT_ACCESS.WRITE
  }
  if (validRelations.some((relation) => relation.access === DOCUMENT_ACCESS.READ)) {
    return DOCUMENT_ACCESS.READ
  }
  return DOCUMENT_ACCESS.NONE
}

export async function getDocumentAccess(docId: string, userId: string): Promise<DocumentAccess> {
  if (!docId || !userId) return DOCUMENT_ACCESS.NONE

  const record = await db.doc.findFirst({
    where: {
      id: docId,
      isDeleted: false,
    },
    select: {
      userId: true,
      shareRelations: {
        where: { userId },
        select: { access: true, authorId: true },
      },
    },
  })

  return resolveDocumentAccess(record, userId)
}
