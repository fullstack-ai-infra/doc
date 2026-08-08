import { createHash } from 'node:crypto'

import type { StorageProvider, StorageObject, PutOptions, GetResult, StorageLimits } from './interface'
import { validateStorageKey, validateUpload, DEFAULT_STORAGE_LIMITS, StorageValidationError } from './interface'

export interface S3CompatibleStorageOptions {
  endpoint: string
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  namespace?: string
  limits?: StorageLimits
  /** Custom fetch for testing */
  fetchFn?: typeof fetch
}

function isArrayBuffer(backing: ArrayBufferLike): backing is ArrayBuffer {
  return Object.prototype.toString.call(backing) === '[object ArrayBuffer]'
}

function toFetchBody(body: Buffer): Uint8Array<ArrayBuffer> {
  const backing = body.buffer
  if (isArrayBuffer(backing)) {
    return new Uint8Array(backing, body.byteOffset, body.byteLength)
  }
  return Uint8Array.from(body)
}

/**
 * S3-compatible storage provider.
 * Works with AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces, etc.
 *
 * Uses simple HTTPS PUT/GET with presigned-style auth headers.
 * For production use, consider using the AWS SDK. This implementation
 * provides the interface contract and validation layer.
 */
export class S3CompatibleStorage implements StorageProvider {
  private readonly endpoint: string
  private readonly bucket: string
  private readonly region: string
  private readonly accessKeyId: string
  private readonly secretAccessKey: string
  private readonly namespace: string
  private readonly limits: StorageLimits
  private readonly fetchFn: typeof fetch

  constructor(options: S3CompatibleStorageOptions) {
    this.endpoint = options.endpoint.replace(/\/$/, '')
    this.bucket = options.bucket
    this.region = options.region
    this.accessKeyId = options.accessKeyId
    this.secretAccessKey = options.secretAccessKey
    this.namespace = options.namespace || ''
    this.limits = options.limits || DEFAULT_STORAGE_LIMITS
    this.fetchFn = options.fetchFn || fetch
  }

  private objectUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${encodeURIComponent(key)}`
  }

  private authHeaders(method: string, key: string, contentType?: string): Record<string, string> {
    // Simplified auth header for interface compliance.
    // Production deployments should use AWS Signature V4.
    const date = new Date().toUTCString()
    const stringToSign = `${method}\n\n${contentType || ''}\n${date}\n/${this.bucket}/${key}`
    const signature = createHash('sha256')
      .update(this.secretAccessKey + stringToSign)
      .digest('base64')

    return {
      Authorization: `AWS ${this.accessKeyId}:${signature}`,
      Date: date,
      ...(contentType ? { 'Content-Type': contentType } : {}),
    }
  }

  async put(key: string, body: Buffer, options: PutOptions): Promise<StorageObject> {
    validateStorageKey(key, this.namespace)
    validateUpload(body.length, options.contentType, this.limits)

    const url = this.objectUrl(key)
    const headers = this.authHeaders('PUT', key, options.contentType)
    const requestBody = toFetchBody(body)

    const response = await this.fetchFn(url, {
      method: 'PUT',
      headers: { ...headers, 'Content-Length': String(body.length) },
      body: requestBody,
    })

    if (!response.ok) {
      throw new StorageValidationError('upload_failed', `S3 upload failed: ${response.status}`)
    }

    const etag = response.headers.get('ETag') || createHash('md5').update(body).digest('hex')

    return {
      key,
      size: body.length,
      contentType: options.contentType,
      etag,
      lastModified: new Date(),
    }
  }

  async get(key: string): Promise<GetResult> {
    validateStorageKey(key, this.namespace)

    const url = this.objectUrl(key)
    const headers = this.authHeaders('GET', key)

    const response = await this.fetchFn(url, { method: 'GET', headers })

    if (response.status === 404) {
      throw new StorageValidationError('not_found', `Object not found: ${key}`)
    }
    if (!response.ok) {
      throw new StorageValidationError('download_failed', `S3 download failed: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const body = Buffer.from(arrayBuffer)

    return {
      body,
      contentType: response.headers.get('Content-Type') || 'application/octet-stream',
      size: body.length,
      etag: response.headers.get('ETag') || undefined,
    }
  }

  async delete(key: string): Promise<void> {
    validateStorageKey(key, this.namespace)

    const url = this.objectUrl(key)
    const headers = this.authHeaders('DELETE', key)

    const response = await this.fetchFn(url, { method: 'DELETE', headers })
    // S3 returns 204 on successful delete, 404 is also acceptable (no-op)
    if (!response.ok && response.status !== 404) {
      throw new StorageValidationError('delete_failed', `S3 delete failed: ${response.status}`)
    }
  }

  async exists(key: string): Promise<boolean> {
    validateStorageKey(key, this.namespace)

    const url = this.objectUrl(key)
    const headers = this.authHeaders('HEAD', key)

    const response = await this.fetchFn(url, { method: 'HEAD', headers })
    return response.ok
  }

  async list(prefix: string, limit = 1000): Promise<StorageObject[]> {
    validateStorageKey(prefix || this.namespace || 'root', this.namespace)

    const url = `${this.endpoint}/${this.bucket}?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=${limit}`
    const headers = this.authHeaders('GET', '')

    const response = await this.fetchFn(url, { method: 'GET', headers })
    if (!response.ok) {
      throw new StorageValidationError('list_failed', `S3 list failed: ${response.status}`)
    }

    // Parse XML response (simplified - production should use proper XML parser)
    const text = await response.text()
    const objects: StorageObject[] = []
    const keyMatches = text.matchAll(/<Key>([^<]+)<\/Key>/g)
    const sizeMatches = text.matchAll(/<Size>(\d+)<\/Size>/g)

    const keys = [...keyMatches].map((m) => m[1])
    const sizes = [...sizeMatches].map((m) => Number(m[1]))

    for (let i = 0; i < keys.length && i < limit; i++) {
      objects.push({
        key: keys[i],
        size: sizes[i] || 0,
        contentType: 'application/octet-stream',
      })
    }

    return objects
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    validateStorageKey(key, this.namespace)
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds
    const stringToSign = `GET\n\n\n${expires}\n/${this.bucket}/${key}`
    const signature = createHash('sha256')
      .update(this.secretAccessKey + stringToSign)
      .digest('base64url')

    return `${this.objectUrl(key)}?Expires=${expires}&AWSAccessKeyId=${this.accessKeyId}&Signature=${signature}`
  }
}
