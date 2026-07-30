import { db } from '@/db/db'
import { PUB_DOC_STATUS } from '@/lib/pub-doc-status'
import { sanitizePublishedHtml } from '@/lib/sanitize-published-html'

export async function getPubDocTitle(publishId: string) {
  try {
    const p = await db.pubDoc.findFirst({
      where: {
        publishId,
        status: {
          in: [PUB_DOC_STATUS.PUBLISHED, PUB_DOC_STATUS.FROZEN],
        },
      },
      select: {
        title: true,
        status: true,
      },
    })
    return p?.title
  } catch (err: any) {
    console.error('getPubDocTitle error: ', err)
    return null
  }
}

export async function getPubDoc(publishId: string) {
  try {
    const p = await db.pubDoc.findUnique({
      where: { publishId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
    })
    if (p == null) return null
    if (p.status === PUB_DOC_STATUS.UNPUBLISHED) return null
    return {
      ...p,
      htmlContent: sanitizePublishedHtml(p.htmlContent),
    }
  } catch (err: any) {
    console.error('getPubDoc error: ', err)
    return null
  }
}
