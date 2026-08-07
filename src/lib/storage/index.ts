import type { StorageProvider } from './interface'
import { FilesystemStorage } from './filesystem'
import { S3CompatibleStorage } from './s3-compatible'

export type { StorageProvider, StorageObject, PutOptions, GetResult, StorageLimits } from './interface'
export { validateStorageKey, validateUpload, StorageValidationError, DEFAULT_STORAGE_LIMITS } from './interface'
export { FilesystemStorage } from './filesystem'
export { S3CompatibleStorage } from './s3-compatible'

/**
 * Create a storage provider based on environment configuration.
 *
 * Environment variables:
 * - STORAGE_PROVIDER: "filesystem" | "s3" (default: "filesystem")
 * - STORAGE_NAMESPACE: key prefix for isolation (default: "files/")
 * - STORAGE_FS_BASE_PATH: base directory for filesystem provider
 * - STORAGE_S3_ENDPOINT: S3 endpoint URL
 * - STORAGE_S3_BUCKET: bucket name
 * - STORAGE_S3_REGION: region
 * - STORAGE_S3_ACCESS_KEY_ID: access key
 * - STORAGE_S3_SECRET_ACCESS_KEY: secret key
 */
export function createStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'filesystem'
  const namespace = process.env.STORAGE_NAMESPACE || 'files/'

  if (provider === 's3') {
    const endpoint = process.env.STORAGE_S3_ENDPOINT
    const bucket = process.env.STORAGE_S3_BUCKET
    const region = process.env.STORAGE_S3_REGION || 'us-east-1'
    const accessKeyId = process.env.STORAGE_S3_ACCESS_KEY_ID
    const secretAccessKey = process.env.STORAGE_S3_SECRET_ACCESS_KEY

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'S3 storage requires STORAGE_S3_ENDPOINT, STORAGE_S3_BUCKET, STORAGE_S3_ACCESS_KEY_ID, and STORAGE_S3_SECRET_ACCESS_KEY'
      )
    }

    return new S3CompatibleStorage({
      endpoint,
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      namespace,
    })
  }

  const basePath = process.env.STORAGE_FS_BASE_PATH || './data/storage'
  return new FilesystemStorage({ basePath, namespace })
}
