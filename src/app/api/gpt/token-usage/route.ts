import { getUserInfo } from '@/lib/session'
import { genSuccessData, genUnAuthData } from '@/app/api/utils/gen-res-data'
import { getTokenUsage } from '@/lib/token-usage'

export async function GET() {
  const user = await getUserInfo()
  if (user == null || !user.id) return Response.json(genUnAuthData())

  const tokenUsage = await getTokenUsage(user.id)
  return Response.json(genSuccessData(tokenUsage))
}
