import { z } from 'zod'
import { getUserInfo } from '@/lib/session'
import { db } from '@/db/db'
import { genSuccessData, genErrorData, genUnAuthData } from '@/app/api/utils/gen-res-data'
import { PUB_DOC_STATUS } from '@/lib/pub-doc-status'
import { DOCUMENT_ACCESS, getDocumentAccess } from '@/lib/document-access'
import { MAX_PUBLISHED_HTML_BYTES, sanitizePublishedHtml } from '@/lib/sanitize-published-html'
import { readJsonBody } from '@/lib/read-json-body'

const createPublicationSchema = z
  .object({
    publishId: z.string().regex(/^[A-Za-z0-9_-]{8,128}$/),
    docId: z.string().min(1).max(128),
    title: z.string().max(500),
    htmlContent: z.string(),
  })
  .strict()

const MAX_PUBLICATION_REQUEST_BYTES = MAX_PUBLISHED_HTML_BYTES * 2 + 64 * 1024

// 新建发布
export async function POST(request: Request) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  const parsed = createPublicationSchema.safeParse(
    await readJsonBody(request, MAX_PUBLICATION_REQUEST_BYTES).catch(() => null)
  )
  if (!parsed.success) {
    return Response.json(genErrorData('Publish payload invalid'))
  }
  const { publishId, docId, title, htmlContent } = parsed.data

  try {
    const documentAccess = await getDocumentAccess(docId, user.id || '')
    if (documentAccess !== DOCUMENT_ACCESS.OWNER) {
      return Response.json(genErrorData('Doc not found'))
    }
    const safeHtmlContent = sanitizePublishedHtml(htmlContent)

    const publishDoc = await db.pubDoc.create({
      data: {
        publishId,
        title,
        htmlContent: safeHtmlContent,
        docId,
        userId: user.id || '',
        status: PUB_DOC_STATUS.PUBLISHED,
        statusUpdatedBy: user.id || '',
      },
    })
    return Response.json(genSuccessData(publishDoc))
  } catch (error) {
    console.error('Create publication error', error)
    return Response.json(genErrorData('Unable to publish document'))
  }
}
