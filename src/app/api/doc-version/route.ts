import { type NextRequest } from 'next/server'
import { genErrorData, genSuccessData, genUnAuthData } from '@/app/api/utils/gen-res-data'
import { getUserInfo } from '@/lib/session'
import { isSameVersionContent } from '@/lib/doc-version/compare'
import { assertOwnDoc, createDocVersion, findLatestDocVersion, listDocVersions } from '@/lib/doc-version/server'

// 创建文档版本，若标题和正文都未变化则跳过保存。
export async function POST(request: Request) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  try {
    const body = await request.json()
    const { docId = '', title = '', content = '', contentBinaryBase64 = '' } = body || {}
    if (!docId || !contentBinaryBase64) {
      return Response.json(genErrorData('docId or contentBinary missing'))
    }

    const hasDoc = await assertOwnDoc(docId, user.id || '')
    if (!hasDoc) {
      return Response.json(genErrorData('Doc not found'))
    }

    const latest = await findLatestDocVersion(docId, user.id || '')
    if (latest && isSameVersionContent(latest, { title, content })) {
      return Response.json(genSuccessData({ skipped: true, id: latest.id }))
    }

    const version = await createDocVersion({
      docId,
      userId: user.id || '',
      title,
      content,
      contentBinaryBase64,
    })
    return Response.json(genSuccessData({ skipped: false, id: version.id }))
  } catch (ex) {
    console.error('Create doc version error', ex)
    return Response.json(genErrorData('Create doc version error'))
  }
}

// 获取当前文档的版本列表，按创建时间倒序返回。
export async function GET(request: NextRequest) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  try {
    const docId = request.nextUrl.searchParams.get('docId') || ''
    if (!docId) {
      return Response.json(genErrorData('docId required'))
    }

    const list = await listDocVersions(docId, user.id || '')
    const normalized = list.map(
      (item: { id: string; docId: string; userId: string; title: string; createdAt: Date }) => ({
        ...item,
        createdAt: formatDateTime(item.createdAt),
      })
    )
    return Response.json(genSuccessData(normalized))
  } catch (ex) {
    console.error('Get doc versions error', ex)
    return Response.json(genErrorData('Get doc versions error'))
  }
}

// 将数据库时间格式化为版本列表使用的时间字符串。
function formatDateTime(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}
