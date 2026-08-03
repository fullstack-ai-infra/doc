import 'dotenv/config'

import CryptoJS from 'crypto-js'

const KEY = process.env.API_AUTH_KEY

export interface CollaborationTokenInfo {
  userId: string
  dt: number
}

function isCollaborationTokenInfo(value: unknown): value is CollaborationTokenInfo {
  if (value == null || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.userId === 'string' && candidate.userId.length > 0 && Number.isFinite(candidate.dt)
}

export function decryptToken(token: string): CollaborationTokenInfo | null {
  if (!KEY || !token) return null
  const bytes = CryptoJS.AES.decrypt(token, KEY)
  const str = bytes.toString(CryptoJS.enc.Utf8)
  try {
    const info: unknown = JSON.parse(str)
    if (!isCollaborationTokenInfo(info)) return null
    const gap = Date.now() - info.dt
    if (Math.abs(gap) > 1000 * 60 * 60 * 18) {
      // greater than 18 hours
      console.error('token expired, gap: ', gap)
      return null
    }
    return info
  } catch {
    return null
  }
}
