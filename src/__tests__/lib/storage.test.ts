import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { types } from 'node:util'
import { runInNewContext } from 'node:vm'

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
    await expect(storage.put('files/../escape.txt', Buffer.from('bad'), { contentType: 'text/plain' })).rejects.toThrow(
      StorageValidationError
    )
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

    await expect(storage.put('files/../escape', Buffer.from('bad'), { contentType: 'text/plain' })).rejects.toThrow(
      StorageValidationError
    )
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

    await expect(storage.put('other/path', Buffer.from('bad'), { contentType: 'text/plain' })).rejects.toThrow(
      StorageValidationError
    )
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

  it('preserves a sliced non-text ArrayBuffer upload and request metadata', async () => {
    const backing = new ArrayBuffer(7)
    new Uint8Array(backing).set([0xaa, 0x00, 0xff, 0x80, 0x41, 0x00, 0xbb])
    const body = Buffer.from(backing, 1, 5)
    let requestBody: Uint8Array | undefined
    let requestHeaders: Headers | undefined
    const mockFetch: typeof fetch = async (_input, init) => {
      if (!(init?.body instanceof Uint8Array)) throw new Error('expected a Uint8Array request body')
      requestBody = init.body
      requestHeaders = new Headers(init.headers)
      return new Response('', { status: 200 })
    }
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'mybucket',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      fetchFn: mockFetch,
    })

    const result = await storage.put('files/non-text.bin', body, { contentType: 'application/pdf' })

    if (requestBody === undefined || requestHeaders === undefined) throw new Error('upload was not captured')
    expect(requestBody.buffer).toBeInstanceOf(ArrayBuffer)
    expect(requestBody.buffer).not.toBe(backing)
    expect(requestBody.byteOffset).toBe(0)
    expect(requestBody.byteLength).toBe(body.byteLength)
    expect(requestBody.buffer.byteLength).toBe(requestBody.byteLength)
    expect(Array.from(requestBody)).toEqual(Array.from(body))
    expect(requestHeaders.get('Content-Length')).toBe('5')
    expect(requestHeaders.get('Content-Type')).toBe('application/pdf')

    const date = requestHeaders.get('Date')
    if (date === null) throw new Error('Date authorization input is missing')
    const stringToSign = `PUT\n\napplication/pdf\n${date}\n/mybucket/files/non-text.bin`
    const expectedSignature = createHash('sha256').update(`secret${stringToSign}`).digest('base64')
    expect(requestHeaders.get('Authorization')).toBe(`AWS key:${expectedSignature}`)
    expect(result.etag).toBe(createHash('md5').update(body).digest('hex'))
  })

  it('preserves a sliced genuine cross-realm ArrayBuffer upload', async () => {
    const candidate: object = runInNewContext(`
      const backing = new ArrayBuffer(7)
      new Uint8Array(backing).set([0xaa, 0x00, 0xff, 0x80, 0x41, 0x00, 0xbb])
      backing
    `)
    expect(candidate).not.toBeInstanceOf(ArrayBuffer)
    expect(types.isArrayBuffer(candidate)).toBe(true)
    if (!types.isArrayBuffer(candidate)) throw new Error('expected a genuine cross-realm ArrayBuffer')

    const body = Buffer.from(candidate, 1, 5)
    let requestBody: Uint8Array | undefined
    let requestHeaders: Headers | undefined
    const mockFetch: typeof fetch = async (_input, init) => {
      if (!(init?.body instanceof Uint8Array)) throw new Error('expected a Uint8Array request body')
      requestBody = init.body
      requestHeaders = new Headers(init.headers)
      return new Response('', { status: 200 })
    }
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'mybucket',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      fetchFn: mockFetch,
    })

    const result = await storage.put('files/cross-realm.bin', body, { contentType: 'application/pdf' })

    if (requestBody === undefined || requestHeaders === undefined) throw new Error('upload was not captured')
    expect(requestBody.buffer).toBeInstanceOf(ArrayBuffer)
    expect(requestBody.buffer).not.toBe(candidate)
    expect(requestBody.byteOffset).toBe(0)
    expect(requestBody.byteLength).toBe(body.byteLength)
    expect(requestBody.buffer.byteLength).toBe(requestBody.byteLength)
    expect(Array.from(requestBody)).toEqual([0x00, 0xff, 0x80, 0x41, 0x00])
    expect(requestHeaders.get('Content-Length')).toBe('5')
    expect(requestHeaders.get('Content-Type')).toBe('application/pdf')
    expect(result.etag).toBe(createHash('md5').update(requestBody).digest('hex'))
  })

  it('copies only the selected bytes from a pooled Buffer subarray', async () => {
    const pooled = Buffer.from([0xaa, 0x00, 0xff, 0x80, 0x41, 0x00, 0xbb])
    const body = pooled.subarray(1, 6)
    let requestBody: Uint8Array | undefined
    const mockFetch: typeof fetch = async (_input, init) => {
      if (!(init?.body instanceof Uint8Array)) throw new Error('expected a Uint8Array request body')
      requestBody = init.body
      return new Response('', { status: 200 })
    }
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'mybucket',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      fetchFn: mockFetch,
    })

    await storage.put('files/pooled.bin', body, { contentType: 'application/pdf' })

    if (requestBody === undefined) throw new Error('upload was not captured')
    expect(requestBody.buffer).toBeInstanceOf(ArrayBuffer)
    expect(requestBody.buffer).not.toBe(body.buffer)
    expect(requestBody.byteOffset).toBe(0)
    expect(requestBody.byteLength).toBe(body.byteLength)
    expect(requestBody.buffer.byteLength).toBe(requestBody.byteLength)
    expect(Array.from(requestBody)).toEqual(Array.from(body))
  })

  it('copies only the selected bytes from a SharedArrayBuffer upload', async () => {
    const backing = new SharedArrayBuffer(7)
    new Uint8Array(backing).set([0xaa, 0x01, 0x00, 0xff, 0x80, 0x02, 0xbb])
    const body = Buffer.from(backing, 1, 5)
    let requestBody: Uint8Array | undefined
    let requestHeaders: Headers | undefined
    const mockFetch: typeof fetch = async (_input, init) => {
      if (!(init?.body instanceof Uint8Array)) throw new Error('expected a Uint8Array request body')
      requestBody = init.body
      requestHeaders = new Headers(init.headers)
      return new Response('', { status: 200, headers: { ETag: 'shared-etag' } })
    }
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'mybucket',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      fetchFn: mockFetch,
    })

    const result = await storage.put('files/shared.bin', body, { contentType: 'application/pdf' })

    if (requestBody === undefined || requestHeaders === undefined) throw new Error('upload was not captured')
    expect(requestBody.buffer).toBeInstanceOf(ArrayBuffer)
    expect(requestBody.buffer).not.toBe(backing)
    expect(requestBody.byteOffset).toBe(0)
    expect(requestBody.byteLength).toBe(body.byteLength)
    expect(requestBody.buffer.byteLength).toBe(requestBody.byteLength)
    expect(Array.from(requestBody)).toEqual(Array.from(body))
    expect(requestHeaders.get('Content-Length')).toBe('5')
    expect(requestHeaders.get('Content-Type')).toBe('application/pdf')
    expect(result.etag).toBe('shared-etag')
  })

  it('copies a SharedArrayBuffer whose toStringTag spoofs ArrayBuffer', async () => {
    const backing = new SharedArrayBuffer(7)
    const source = new Uint8Array(backing)
    source.set([0xaa, 0x01, 0x00, 0xff, 0x80, 0x02, 0xbb])
    Object.defineProperty(backing, Symbol.toStringTag, {
      value: 'ArrayBuffer',
      configurable: true,
    })
    expect(Object.prototype.toString.call(backing)).toBe('[object ArrayBuffer]')

    const body = Buffer.from(backing, 1, 5)
    const expectedBytes = Array.from(body)
    const expectedEtag = createHash('md5').update(Uint8Array.from(expectedBytes)).digest('hex')
    const decoyBacking = new ArrayBuffer(5)
    const decoyBytes = new Uint8Array(decoyBacking)
    decoyBytes.fill(0x09)
    let constructorReads = 0
    let speciesReads = 0
    let valueOfCalls = 0
    const decoyConstructor: object = {}
    Object.defineProperty(decoyConstructor, Symbol.species, {
      get() {
        speciesReads += 1
        throw new Error('snapshot must not read input Symbol.species')
      },
    })
    const originalPrototype = Reflect.getPrototypeOf(body)
    if (originalPrototype === null) throw new Error('expected a Buffer prototype')
    const decoyPrototype: object = Object.create(originalPrototype, {
      byteOffset: { value: 0 },
      byteLength: { value: 1 },
      constructor: {
        get() {
          constructorReads += 1
          return decoyConstructor
        },
      },
      valueOf: {
        value() {
          valueOfCalls += 1
          return body
        },
      },
    })
    Object.setPrototypeOf(body, decoyPrototype)
    Object.defineProperties(body, {
      buffer: { value: decoyBacking },
      length: { value: DEFAULT_STORAGE_LIMITS.maxUploadBytes + 1 },
      [Symbol.iterator]: {
        value() {
          throw new Error('snapshot must not read the input iterator')
        },
      },
    })
    expect(() =>
      Object.defineProperty(body, '0', {
        get() {
          return 0x09
        },
      })
    ).toThrow(TypeError)
    let requestBody: Uint8Array | undefined
    let requestHeaders: Headers | undefined
    const mockFetch: typeof fetch = async (_input, init) => {
      if (!(init?.body instanceof Uint8Array)) throw new Error('expected a Uint8Array request body')
      requestBody = init.body
      requestHeaders = new Headers(init.headers)
      source[1] = 0x7e
      decoyBytes.fill(0x08)
      expect(Array.from(init.body)).toEqual(expectedBytes)
      return new Response('', { status: 200 })
    }
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'mybucket',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      fetchFn: mockFetch,
    })

    const result = await storage.put('files/spoofed-shared.bin', body, { contentType: 'application/pdf' })

    if (requestBody === undefined || requestHeaders === undefined) throw new Error('upload was not captured')
    source[2] = 0x7d
    decoyBytes.fill(0x07)
    expect(requestBody.buffer).toBeInstanceOf(ArrayBuffer)
    expect(requestBody.buffer).not.toBe(backing)
    expect(requestBody.byteOffset).toBe(0)
    expect(requestBody.byteLength).toBe(expectedBytes.length)
    expect(requestBody.buffer.byteLength).toBe(requestBody.byteLength)
    expect(Array.from(requestBody)).toEqual(expectedBytes)
    expect(requestHeaders.get('Content-Length')).toBe('5')
    expect(requestHeaders.get('Content-Type')).toBe('application/pdf')
    expect(requestHeaders.get('Authorization')).toMatch(/^AWS key:/)
    expect(constructorReads).toBe(0)
    expect(speciesReads).toBe(0)
    expect(valueOfCalls).toBe(0)
    expect(result.size).toBe(expectedBytes.length)
    expect(result.etag).toBe(expectedEtag)
  })

  it('rejects an oversized Buffer even when its own length is small', async () => {
    const backing = new SharedArrayBuffer(6)
    const body = Buffer.from(backing)
    Object.defineProperty(body, 'length', { value: 1 })
    let fetchCalls = 0
    const mockFetch: typeof fetch = async () => {
      fetchCalls += 1
      return new Response('', { status: 200 })
    }
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'mybucket',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      limits: { ...DEFAULT_STORAGE_LIMITS, maxUploadBytes: 5 },
      fetchFn: mockFetch,
    })

    await expect(storage.put('files/oversized.bin', body, { contentType: 'application/pdf' })).rejects.toMatchObject({
      code: 'upload_too_large',
    })
    expect(fetchCalls).toBe(0)
  })

  it('rejects a TypedArray proxy without invoking attacker-controlled hooks', async () => {
    let iteratorCalls = 0
    let valueOfCalls = 0
    let constructorReads = 0
    let speciesReads = 0
    let getCalls = 0
    let getPrototypeOfCalls = 0
    let hasCalls = 0
    let ownKeysCalls = 0
    let getOwnPropertyDescriptorCalls = 0
    const target = Buffer.from([0x01, 0x02, 0x03])
    const decoyConstructor: object = {}
    Object.defineProperty(decoyConstructor, Symbol.species, {
      get() {
        speciesReads += 1
        throw new Error('proxy input Symbol.species must not run')
      },
    })
    Object.defineProperties(target, {
      [Symbol.iterator]: {
        value() {
          iteratorCalls += 1
          return [0x09][Symbol.iterator]()
        },
      },
      valueOf: {
        value() {
          valueOfCalls += 1
          return target
        },
      },
      constructor: {
        get() {
          constructorReads += 1
          return decoyConstructor
        },
      },
    })
    const body = new Proxy(target, {
      get() {
        getCalls += 1
        throw new Error('proxy get trap must not run')
      },
      getPrototypeOf() {
        getPrototypeOfCalls += 1
        throw new Error('proxy getPrototypeOf trap must not run')
      },
      has() {
        hasCalls += 1
        throw new Error('proxy has trap must not run')
      },
      ownKeys() {
        ownKeysCalls += 1
        throw new Error('proxy ownKeys trap must not run')
      },
      getOwnPropertyDescriptor() {
        getOwnPropertyDescriptorCalls += 1
        throw new Error('proxy getOwnPropertyDescriptor trap must not run')
      },
    })
    expect(types.isUint8Array(target)).toBe(true)
    expect(types.isUint8Array(body)).toBe(false)
    let fetchCalls = 0
    const mockFetch: typeof fetch = async () => {
      fetchCalls += 1
      return new Response('', { status: 200 })
    }
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'mybucket',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      fetchFn: mockFetch,
    })

    await expect(storage.put('files/proxy.bin', body, { contentType: 'application/pdf' })).rejects.toMatchObject({
      code: 'invalid_upload_body',
    })
    expect(getCalls).toBe(0)
    expect(getPrototypeOfCalls).toBe(0)
    expect(hasCalls).toBe(0)
    expect(ownKeysCalls).toBe(0)
    expect(getOwnPropertyDescriptorCalls).toBe(0)
    expect(iteratorCalls).toBe(0)
    expect(valueOfCalls).toBe(0)
    expect(constructorReads).toBe(0)
    expect(speciesReads).toBe(0)
    expect(fetchCalls).toBe(0)
  })

  it('rejects non-Uint8 binary views before fetch', async () => {
    let fetchCalls = 0
    const mockFetch: typeof fetch = async () => {
      fetchCalls += 1
      return new Response('', { status: 200 })
    }
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'mybucket',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      fetchFn: mockFetch,
    })
    const candidates: object[] = [
      new Uint8ClampedArray([0x01, 0x02]),
      new Uint16Array([0x0102, 0x0304]),
      new DataView(new ArrayBuffer(4)),
      Object.create(Uint8Array.prototype),
    ]

    for (const [index, candidate] of candidates.entries()) {
      expect(types.isUint8Array(candidate)).toBe(false)
      await expect(
        Reflect.apply(storage.put, storage, [
          `files/non-uint8-${index}.bin`,
          candidate,
          { contentType: 'application/pdf' },
        ])
      ).rejects.toMatchObject({ code: 'invalid_upload_body' })
    }
    expect(fetchCalls).toBe(0)
  })

  it('uses the captured Uint8Array brand predicate', async () => {
    const originalDescriptor = Reflect.getOwnPropertyDescriptor(types, 'isUint8Array')
    if (originalDescriptor === undefined) throw new Error('expected the native isUint8Array descriptor')
    let requestBody: Uint8Array | undefined
    const mockFetch: typeof fetch = async (_input, init) => {
      if (!(init?.body instanceof Uint8Array)) throw new Error('expected a Uint8Array request body')
      requestBody = init.body
      return new Response('', { status: 200 })
    }
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'mybucket',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      fetchFn: mockFetch,
    })
    try {
      const replaced = Reflect.defineProperty(types, 'isUint8Array', {
        ...originalDescriptor,
        value: () => false,
      })
      if (!replaced) throw new Error('failed to replace the live isUint8Array property')

      const result = await storage.put('files/captured-brand.bin', Buffer.from([0x01, 0x02]), {
        contentType: 'application/pdf',
      })

      if (requestBody === undefined) throw new Error('upload was not captured')
      expect(Array.from(requestBody)).toEqual([0x01, 0x02])
      expect(result.size).toBe(2)
    } finally {
      const restored = Reflect.defineProperty(types, 'isUint8Array', originalDescriptor)
      if (!restored) throw new Error('failed to restore the native isUint8Array property')
    }
  })

  it('fails closed if the internal byte length changes before snapshot', async () => {
    const typedArrayPrototype = Reflect.getPrototypeOf(Uint8Array.prototype)
    if (typedArrayPrototype === null) throw new Error('expected the TypedArray prototype')
    const byteLengthDescriptor = Reflect.getOwnPropertyDescriptor(typedArrayPrototype, 'byteLength')
    if (byteLengthDescriptor?.get === undefined) throw new Error('expected the TypedArray byteLength getter')
    const byteLengthGetter = byteLengthDescriptor.get
    const originalCallDescriptor = Reflect.getOwnPropertyDescriptor(byteLengthGetter, 'call')
    const backing = new ArrayBuffer(8, { maxByteLength: 16 })
    const body = Buffer.from(backing)
    let contentTypeChecks = 0
    let poisonCalls = 0
    class GrowingAllowedContentTypes extends Set<string> {
      override has(value: string): boolean {
        contentTypeChecks += 1
        backing.resize(12)
        const poisoned = Reflect.defineProperty(byteLengthGetter, 'call', {
          configurable: true,
          value() {
            poisonCalls += 1
            return 8
          },
        })
        if (!poisoned) throw new Error('failed to poison the live byteLength getter call property')
        return super.has(value)
      }
    }
    let fetchCalls = 0
    const mockFetch: typeof fetch = async () => {
      fetchCalls += 1
      return new Response('', { status: 200 })
    }
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'mybucket',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      limits: {
        ...DEFAULT_STORAGE_LIMITS,
        allowedContentTypes: new GrowingAllowedContentTypes(['application/pdf']),
      },
      fetchFn: mockFetch,
    })

    try {
      await expect(storage.put('files/resized.bin', body, { contentType: 'application/pdf' })).rejects.toMatchObject({
        code: 'upload_size_changed',
      })
      expect(contentTypeChecks).toBe(1)
      expect(poisonCalls).toBe(0)
      expect(fetchCalls).toBe(0)
    } finally {
      const restored =
        originalCallDescriptor === undefined
          ? Reflect.deleteProperty(byteLengthGetter, 'call')
          : Reflect.defineProperty(byteLengthGetter, 'call', originalCallDescriptor)
      if (!restored) throw new Error('failed to restore the byteLength getter call property')
    }
  })

  it('preserves an empty upload without exposing unrelated backing bytes', async () => {
    const body = Buffer.alloc(0)
    let requestBody: Uint8Array | undefined
    let requestHeaders: Headers | undefined
    const mockFetch: typeof fetch = async (_input, init) => {
      if (!(init?.body instanceof Uint8Array)) throw new Error('expected a Uint8Array request body')
      requestBody = init.body
      requestHeaders = new Headers(init.headers)
      return new Response('', { status: 200 })
    }
    const storage = new S3CompatibleStorage({
      endpoint: 'https://s3.example.com',
      bucket: 'mybucket',
      region: 'us-east-1',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      namespace: 'files/',
      fetchFn: mockFetch,
    })

    const result = await storage.put('files/empty.bin', body, { contentType: 'application/pdf' })

    if (requestBody === undefined || requestHeaders === undefined) throw new Error('upload was not captured')
    expect(requestBody.byteLength).toBe(0)
    expect(requestBody.buffer.byteLength).toBe(requestBody.byteLength)
    expect(Array.from(requestBody)).toEqual([])
    expect(requestHeaders.get('Content-Length')).toBe('0')
    expect(requestHeaders.get('Content-Type')).toBe('application/pdf')
    expect(result.etag).toBe(createHash('md5').update(body).digest('hex'))
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
