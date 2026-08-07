import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, unlink, stat, readdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'

import type { StorageProvider, StorageObject, PutOptions, GetResult, StorageLimits } from './interface'
import { validateStorageKey, validateUpload, DEFAULT_STORAGE_LIMITS, StorageValidationError } from './interface'

export interface FilesystemStorageOptions {
  basePath: string
  namespace?: string
  limits?: StorageLimits
}

/**
 * Filesystem-based storage provider for development and single-node deployments.
 */
export class FilesystemStorage implements StorageProvider {
  private readonly basePath: string
  private readonly namespace: string
  private readonly limits: StorageLimits

  constructor(options: FilesystemStorageOptions) {
    this.basePath = options.basePath
    this.namespace = options.namespace || ''
    this.limits = options.limits || DEFAULT_STORAGE_LIMITS
  }

  private resolvePath(key: string): string {
    validateStorageKey(key, this.namespace)
    return join(this.basePath, key)
  }

  private metaPath(filePath: string): string {
    return filePath + '.meta.json'
  }

  async put(key: string, body: Buffer, options: PutOptions): Promise<StorageObject> {
    validateUpload(body.length, options.contentType, this.limits)

    const filePath = this.resolvePath(key)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, body)

    const meta = {
      contentType: options.contentType,
      size: body.length,
      etag: createHash('md5').update(body).digest('hex'),
      lastModified: new Date().toISOString(),
      metadata: options.metadata || {},
    }
    await writeFile(this.metaPath(filePath), JSON.stringify(meta))

    return {
      key,
      size: meta.size,
      contentType: meta.contentType,
      etag: meta.etag,
      lastModified: new Date(meta.lastModified),
    }
  }

  async get(key: string): Promise<GetResult> {
    const filePath = this.resolvePath(key)

    try {
      const body = await readFile(filePath)
      const metaStr = await readFile(this.metaPath(filePath), 'utf-8')
      const meta = JSON.parse(metaStr)

      return {
        body,
        contentType: meta.contentType || 'application/octet-stream',
        size: body.length,
        etag: meta.etag,
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new StorageValidationError('not_found', `Object not found: ${key}`)
      }
      throw error
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolvePath(key)
    try {
      await unlink(filePath)
      await unlink(this.metaPath(filePath)).catch(() => {})
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.resolvePath(key)
    try {
      await stat(filePath)
      return true
    } catch {
      return false
    }
  }

  async list(prefix: string, limit = 1000): Promise<StorageObject[]> {
    validateStorageKey(prefix || this.namespace || 'root', this.namespace)
    const dirPath = join(this.basePath, prefix)
    const results: StorageObject[] = []

    try {
      const entries = await readdir(dirPath, { withFileTypes: true, recursive: true })
      for (const entry of entries) {
        if (results.length >= limit) break
        if (!entry.isFile() || entry.name.endsWith('.meta.json')) continue

        const fullPath = join(entry.parentPath || dirPath, entry.name)
        const key = fullPath.slice(this.basePath.length + 1)

        try {
          const metaStr = await readFile(this.metaPath(fullPath), 'utf-8')
          const meta = JSON.parse(metaStr)
          results.push({
            key,
            size: meta.size,
            contentType: meta.contentType,
            etag: meta.etag,
            lastModified: meta.lastModified ? new Date(meta.lastModified) : undefined,
          })
        } catch {
          const info = await stat(fullPath)
          results.push({
            key,
            size: info.size,
            contentType: 'application/octet-stream',
          })
        }
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') throw error
    }

    return results
  }
}
