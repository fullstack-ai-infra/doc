import OSS from 'ali-oss'

export function getOssClient() {
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID || ''
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET || ''
  const region = process.env.OSS_REGION || ''
  const bucket = process.env.OSS_BUCKET || ''

  if (!accessKeyId || !accessKeySecret || !region || !bucket) {
    throw new Error('Object storage is not configured')
  }

  return new OSS({
    accessKeyId,
    accessKeySecret,
    region,
    bucket,
  })
}
