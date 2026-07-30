import { getAdminOverview } from '@/lib/admin-data'
import { requireAdminUser } from '@/lib/admin'
import { genSuccessData, genUnAuthData } from '@/app/api/utils/gen-res-data'

export async function GET() {
  const user = await requireAdminUser()
  if (user == null) {
    return Response.json(genUnAuthData())
  }

  const data = await getAdminOverview()
  return Response.json(genSuccessData(data))
}
