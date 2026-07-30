import { getUserInfo } from '@/lib/session'
import { genSuccessData, genUnAuthData, genErrorData } from '../utils/gen-res-data'
import { getOssClient } from '@/lib/oss'
import { getFileExtension } from './util'

export async function POST(req: Request) {
  const user = await getUserInfo()
  if (user == null) return Response.json(genUnAuthData())

  const formData = await req.formData()
  const file = formData.get('file') as File // `file` 是 FormData key
  const ext = getFileExtension(file.name)

  // oss 文件名： `/` 可自动创建文件夹，randomUUID 用于避免文件名重复
  const ossFileName = `files/u-${user.id}/imgs/${crypto.randomUUID()}.${ext}`

  try {
    const ossClient = getOssClient()
    const result = await ossClient.put(ossFileName, Buffer.from(await file.arrayBuffer()))

    // 可自定义 headers，定义文档的属性，具体参考 ali-oss 文档

    return Response.json(genSuccessData(result))
  } catch (e) {
    console.error('upload error', e)
    return Response.json(genErrorData('upload error'))
  }
}
