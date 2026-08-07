/**
 * Provider-neutral object storage interface.
 *
 * Implementations must validate that keys cannot escape the configured
 * namespace and enforce upload limits and content validation.
 */

export interface StorageObject {
  key: string
  size: number
  contentType: string
  etag?: string
  lastModified?: Date
}

export interface PutOptions {
  contentType: string
  metadata?: Record<string, string>
}

export interface GetResult {
  body: Buffer
  contentType: string
  size: number
  etag?: string
}

export interface StorageProvider {
  /**
   * Store an object. Rejects if key escapes namespace or exceeds limits.
   */
  put(key: string, body: Buffer, options: PutOptions): Promise<StorageObject>

  /**
   * Retrieve an object by key.
   */
  get(key: string): Promise<GetResult>

  /**
   * Delete an object by key. No-op if not found.
   */
  delete(key: string): Promise<void>

  /**
   * Check if an object exists.
   */
  exists(key: string): Promise<boolean>

  /**
   * List objects with a given prefix.
   */
  list(prefix: string, limit?: number): Promise<StorageObject[]>

  /**
   * Get a signed/presigned URL for download (optional, may throw if unsupported).
   */
  getSignedUrl?(key: string, expiresInSeconds: number): Promise<string>
}

// --- Validation ---

const PATH_TRAVERSAL_PATTERN = /(?:^|[\\/])\.\.(?:[\\/]|$)/
const UNSAFE_CHARACTERS = /[\x00-\x1f\x7f]/
const MAX_KEY_LENGTH = 1024

export class StorageValidationError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'StorageValidationError'
    this.code = code
  }
}

/**
 * Validate that a storage key is safe and within namespace bounds.
 */
export function validateStorageKey(key: string, namespace: string): void {
  if (!key || key.length > MAX_KEY_LENGTH) {
    throw new StorageValidationError('invalid_key', 'Storage key is empty or too long')
  }

  if (UNSAFE_CHARACTERS.test(key)) {
    throw new StorageValidationError('invalid_key', 'Storage key contains control characters')
  }

  if (PATH_TRAVERSAL_PATTERN.test(key)) {
    throw new StorageValidationError('path_escape', 'Storage key attempts path traversal')
  }

  // Key must start with namespace prefix
  if (namespace && !key.startsWith(namespace)) {
    throw new StorageValidationError('namespace_escape', 'Storage key escapes the configured namespace')
  }
}

// --- Limits ---

export interface StorageLimits {
  maxUploadBytes: number
  maxDownloadBytes: number
  allowedContentTypes: Set<string> | null // null = allow all
}

export const DEFAULT_STORAGE_LIMITS: StorageLimits = {
  maxUploadBytes: 10 * 1024 * 1024, // 10 MB
  maxDownloadBytes: 50 * 1024 * 1024, // 50 MB
  allowedContentTypes: new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'application/json',
  ]),
}

export function validateUpload(size: number, contentType: string, limits: StorageLimits): void {
  if (size > limits.maxUploadBytes) {
    throw new StorageValidationError(
      'upload_too_large',
      `Upload exceeds maximum size of ${limits.maxUploadBytes} bytes`
    )
  }

  if (limits.allowedContentTypes && !limits.allowedContentTypes.has(contentType)) {
    throw new StorageValidationError('content_type_not_allowed', `Content type ${contentType} is not allowed`)
  }
}
