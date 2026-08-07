import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FilesystemStorage } from '@/lib/storage/filesystem'
import {
  validateStorageKey,
  validateUpload,
  StorageValidationError,
  DEFAULT_STORAGE_LIMITS,
} from '@/lib/storage/interface'
import { S3CompatibleStorage } from '@/lib/storage/s3-compatible'

describe('storage validation', () => {
  describe('validateStorageKey', () => {
    it('accepts valid keys', () => {
      expect(() => validateStorageKey('files/user-1/image.png', 'files/')).not.toThrow()
      expect(() => validateStorageKey('files/a/b/c.json', 'files/')).not.toThrow()
    })

    it('rejects path traversal', () => {
      expect(() => validateStorageKey('files/../etc/passwd', 'files/')).toThrow(StorageValidationError)
      expect(() => validateStorageKey('files/a/../../secret', 'files/')).toThrow(StorageValidationError)
    })

    it('rejects control characters', () => {
      expect(() => validateStorageKey('files/\x00bad', 'files/')).toThrow(StorageValidationError)
      expect(() => validateStorageKey('files/\ninjection', 'files/')).toThrow(StorageValidationError)
    })

    it('rejects namespace escape', () => {
      expect(() => validateStorageKey('other/path/file.txt', 'files/')).toThrow(StorageValidationError)
      expect(() => validateStorageKey('', 'files/')).toThrow(StorageValidationError)
    })

    it('rejects overly long keys', () => {
      const longKey = 'files/' + 'a'.repeat(1100)
      expect(() => validateStorageKey(longKey, 'files/')).toThrow(StorageValidationError)
    })
  })

  describe('validateUpload', () => {
    it('accepts valid uploads', () => {
      expect(() => validateUpload(1024, 'image/png', DEFAULT_STORAGE_LIMITS)).not.toThrow()
    })

    it('rejects oversized uploads', () => {
      expect(() => validateUpload(100 * 1024 * 1024, 'image/png', DEFAULT_STORAGE_LIMITS)).toThrow(
        StorageValidationError
      )
    })

    it('rejects disallowed content types', () => {
      expect(() => validateUpload(100, 'application/x-executable', DEFAULT_STORAGE_LIMITS)).toThrow(
        StorageValidationError
      )
    })
  })
})

describe('FilesystemStorage', () => {
  let tempDir: string
  let storage: FilesystemStorage

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'doc-storage-test-'))
    storage = new FilesystemStorage({ basePath: tempDir, namespace: 'files/' })
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('put and get round-trip', async () => {
    const content = Buffer.from('hello world')
    const result = await storage.put('files/test.txt', content, { contentType: 'text/plain' })

    expect(result.key).toBe('files/test.txt')
    expect(result.size).toBe(11)
    expect(result.etag).toBeDefined()

    const retrieved = await storage.get('files/test.txt')
    expect(retrieved.body.toString()).toBe('hello world')
    expect(retrieved.contentType).toBe('text/plain')
  })

  it('exists returns true for stored objects', async () => {
    await storage.put('files/exists.txt', Buffer.from('data'), { contentType: 'text/plain' })
    expect(await storage.exists('files/exists.txt')).toBe(true)
    expect(await storage.exists('files/missing.txt')).toBe(false)
  })

  it('delete removes objects', async () => {
    await storage.put('files/del.txt', Buffer.from('data'), { contentType: 'text/plain' })
    await storage.delete('files/del.txt')
    expect(await storage.exists('files/del.txt')).toBe(false)
  })

  it('delete is no-op for missing objects', async () => {
    await expect(storage.delete('files/nonexistent.txt')).resolves.not.toThrow()
  })

  it('get throws for missing objects', async () => {
    await expect(storage.get('files/missing.txt')).rejects.toThrow(StorageValidationError)
  })

  it('rejects path traversal in put', async () => {
    await expect(
      storage.put('files/../escape.txt', Buffer.from('bad'), { contentType: 'text/plain' })
    ).rejects.toThrow(StorageValidationError)
  })

  it('rejects oversized uploads', async () => {
    const limits = { ...DEFAULT_STORAGE_LIMITS, maxUploadBytes: 10 }
    const smallStorage = new FilesystemStorage({ basePath: tempDir, namespace: 'files/', limits })
    await expect(
      smallStorage.put('files/big.txt', Buffer.from('a'.repeat(100)), { contentType: 'text/plain' })
    ).rejects.toThrow(StorageValidationError)
  })

  it('list returns stored objects', async () => {
    await storage.put('files/a.txt', Buffer.from('a'), { contentType: 'text/plain' })
    await storage.put('files/b.txt', Buffer.from('b'), { contentType: 'text/plain' })

    const objects = await storage.list('files/')
    expect(objects.length).toBeGreaterThanOrEqual(2)
  })
})

describe('S3CompatibleStorage', () => {
  it('rejects path traversal', async () => {
    const mockFetch = async () => new Response('ok', { status: 200 })
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'test',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      fetchFn: mockFetch as any,
    })

    await expect(
      storage.put('files/../escape', Buffer.from('bad'), { contentType: 'text/plain' })
    ).rejects.toThrow(StorageValidationError)
  })

  it('rejects namespace escape', async () => {
    const mockFetch = async () => new Response('ok', { status: 200 })
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'test',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      fetchFn: mockFetch as any,
    })

    await expect(
      storage.put('other/path', Buffer.from('bad'), { contentType: 'text/plain' })
    ).rejects.toThrow(StorageValidationError)
  })

  it('calls fetch with correct URL on put', async () => {
    const calls: { url: string; method: string }[] = []
    const mockFetch = async (url: string, init: any) => {
      calls.push({ url, method: init.method })
      return new Response('', { status: 200, headers: { ETag: '"abc"' } })
    }

    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'mybucket',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      fetchFn: mockFetch as any,
    })

    await storage.put('files/test.png', Buffer.from('img'), { contentType: 'image/png' })
    expect(calls[0].method).toBe('PUT')
    expect(calls[0].url).toContain('mybucket')
    expect(calls[0].url).toContain('files%2Ftest.png')
  })

  it('handles 404 on get as not_found', async () => {
    const mockFetch = async () => new Response('Not Found', { status: 404 })
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'test',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      fetchFn: mockFetch as any,
    })

    await expect(storage.get('files/missing.txt')).rejects.toThrow('Object not found')
  })
})
