import { signOut } from 'auth'
import { getUserInfo } from '@/lib/session'
import { genSuccessData, genUnAuthData } from '../../utils/gen-res-data'

export async function POST(request: Request) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  try {
    await signOut({ redirect: false })
  } catch (e) {}

  return Response.json(genSuccessData())
}
