import 'server-only' // 标记只在服务端使用（客户端组件引入会报错）
import { auth } from 'auth'
import { db } from '@/db/db'

const ENV = process.env.NODE_ENV

export async function getUserInfo() {
  if (ENV === 'test') return null

  const session = await auth()
  if (!session?.user) {
    return null
  }

  const user = session.user // 格式如 { id, name, email, image }
  if (user.email == null) {
    return null
  }

  if (user.id == null) {
    try {
      const res = await db.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      })
      if (res == null) {
        return null
      }
      return { ...user, id: res.id }
    } catch (e) {
      console.error('get user info error ', e)
      return null
    }
  }
  return user
}
