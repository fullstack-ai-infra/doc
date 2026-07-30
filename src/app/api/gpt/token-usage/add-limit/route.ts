import { getUserInfo } from '@/lib/session'
import { db } from '@/db/db'
import { genSuccessData, genErrorData, genUnAuthData } from '@/app/api/utils/gen-res-data'
import { isOneWeekAgo } from '@/lib/dt'
import { AI_DEFAULT_TOKEN_LIMIT } from '@/constants'

export async function POST() {
  const user = await getUserInfo()
  if (user == null || !user.id) return Response.json(genUnAuthData())

  const tokenUsage = await db.tokenUsage.findUnique({
    where: {
      userId: user.id,
    },
  })
  if (tokenUsage == null) return Response.json(genErrorData('tokenUsage not found'))
  const { tokensLimit, updateLimitAt } = tokenUsage

  if (tokensLimit >= AI_DEFAULT_TOKEN_LIMIT) {
    return Response.json(genErrorData(`token limit 大于 ${AI_DEFAULT_TOKEN_LIMIT} ，不能再增加`))
  }

  if (!isOneWeekAgo(updateLimitAt)) {
    return Response.json(genErrorData('一周内只能增加一次 token limit'))
  }

  await db.tokenUsage.update({
    where: { id: tokenUsage.id },
    data: { tokensLimit: tokensLimit + 1000, updateLimitAt: new Date() },
  })

  return Response.json(genSuccessData())
}
