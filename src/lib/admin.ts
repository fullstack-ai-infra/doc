import 'server-only'

import { db } from '@/db/db'
import { getUserInfo } from '@/lib/session'

export type AdminUser = {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  isAdmin: true
}

export async function requireAdminUser(): Promise<AdminUser | null> {
  const user = await getUserInfo()
  if (user == null || user.id == null) {
    return null
  }

  const adminUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      isAdmin: true,
    },
  })

  if (adminUser == null || !adminUser.isAdmin) {
    return null
  }

  return adminUser as AdminUser
}
