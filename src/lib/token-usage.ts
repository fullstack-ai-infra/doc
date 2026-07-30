import { AI_DEFAULT_TOKEN_LIMIT } from '@/constants'
import { db } from '@/db/db'
import { isSameMonth } from '@/lib/dt'

// 获取用户的 token 使用记录
export async function getTokenUsage(userId: string) {
  let tokenUsage = await db.tokenUsage.findUnique({
    where: { userId },
  })

  // 不存在时自动创建
  if (tokenUsage == null) {
    tokenUsage = await db.tokenUsage.create({
      data: {
        userId,
        tokensLimit: AI_DEFAULT_TOKEN_LIMIT,
        updateLimitAt: new Date(),
      },
    })
  }

  // 如果到了新月份且剩余额度低于默认值，则自动重置月额度。
  if (!isSameMonth(tokenUsage.updateLimitAt) && tokenUsage.tokensLimit < AI_DEFAULT_TOKEN_LIMIT) {
    tokenUsage = await db.tokenUsage.update({
      where: { id: tokenUsage.id },
      data: {
        tokensLimit: AI_DEFAULT_TOKEN_LIMIT,
        updateLimitAt: new Date(),
      },
    })
  }

  return tokenUsage
}

// 更新用户 token 使用情况
export async function updateTokenUsage(userId: string, totalTokens: number, tokensLimit: number, usedTokens: number) {
  if (usedTokens <= 0) return

  // 一次对话完成后，同时增加累计消耗并扣减剩余额度。
  const nextTotalTokens = totalTokens + usedTokens
  const nextTokensLimit = Math.max(tokensLimit - usedTokens, 0)

  try {
    await db.tokenUsage.update({
      where: { userId },
      data: {
        totalTokens: nextTotalTokens,
        tokensLimit: nextTokensLimit,
      },
    })
  } catch (error) {
    console.error('[token-usage] update failed:', error)
  }
}
