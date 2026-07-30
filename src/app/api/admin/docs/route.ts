import { getAdminDocs, updateAdminDocDeleteStatus } from '@/lib/admin-data'
import { requireAdminUser } from '@/lib/admin'
import { genErrorData, genSuccessData, genUnAuthData } from '@/app/api/utils/gen-res-data'

export async function GET(request: Request) {
  const user = await requireAdminUser()
  if (user == null) {
    return Response.json(genUnAuthData())
  }

  const { searchParams } = new URL(request.url)
  const data = await getAdminDocs({
    q: searchParams.get('q') || '',
    author: searchParams.get('author') || '',
    deleteStatus: searchParams.get('deleteStatus') || 'all',
    publishStatus: searchParams.get('publishStatus') || 'all',
    page: searchParams.get('page') || '1',
  })

  return Response.json(genSuccessData(data))
}

export async function PATCH(request: Request) {
  const user = await requireAdminUser()
  if (user == null) {
    return Response.json(genUnAuthData())
  }

  try {
    const body = await request.json()
    const { id, isDeleted } = body

    if (typeof id !== 'string' || typeof isDeleted !== 'boolean') {
      return Response.json(genErrorData('参数错误'))
    }

    const data = await updateAdminDocDeleteStatus(id, isDeleted)
    return Response.json(genSuccessData(data))
  } catch (error) {
    return Response.json(genErrorData(error instanceof Error ? error.message : '操作失败'))
  }
}
