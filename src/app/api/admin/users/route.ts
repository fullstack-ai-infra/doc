import { getAdminUsers } from '@/lib/admin-data'
import { requireAdminUser } from '@/lib/admin'
import { genSuccessData, genUnAuthData } from '@/app/api/utils/gen-res-data'

export async function GET(request: Request) {
  const user = await requireAdminUser()
  if (user == null) {
    return Response.json(genUnAuthData())
  }

  const { searchParams } = new URL(request.url)
  const data = await getAdminUsers({
    q: searchParams.get('q') || '',
    page: searchParams.get('page') || '1',
  })

  return Response.json(genSuccessData(data))
}
