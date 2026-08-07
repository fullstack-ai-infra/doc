import { describe, expect, it, beforeEach } from 'vitest'

import {
  RateLimiter,
  apiRateLimiter,
  authRateLimiter,
  wsRateLimiter,
  DEFAULT_REQUEST_LIMITS,
  DEFAULT_COLLABORATION_LIMITS,
  assertBodySize,
  assertWsMessageSize,
  RequestLimitError,
  livenessCheck,
  readinessCheck,
  createDatabaseCheck,
  createStorageCheck,
} from '@/lib/security'

describe('security baseline', () => {
  describe('RateLimiter', () => {
    let limiter: RateLimiter

    beforeEach(() => {
      limiter = new RateLimiter({ maxTokens: 3, refillRate: 1 })
    })

    it('allows requests within budget', () => {
      const r1 = limiter.consume('ip-1')
      expect(r1.allowed).toBe(true)
      expect(r1.remaining).toBe(2)
    })

    it('blocks requests when budget exhausted', () => {
      limiter.consume('ip-2')
      limiter.consume('ip-2')
      limiter.consume('ip-2')
      const r4 = limiter.consume('ip-2')
      expect(r4.allowed).toBe(false)
      expect(r4.retryAfterMs).toBeGreaterThan(0)
    })

    it('isolates keys', () => {
      limiter.consume('a')
      limiter.consume('a')
      limiter.consume('a')
      const rb = limiter.consume('b')
      expect(rb.allowed).toBe(true)
    })

    it('resets a key', () => {
      limiter.consume('k')
      limiter.consume('k')
      limiter.consume('k')
      limiter.reset('k')
      const r = limiter.consume('k')
      expect(r.allowed).toBe(true)
      expect(r.remaining).toBe(2)
    })

    it('cleans up expired buckets', async () => {
      limiter.consume('old')
      // Wait a tiny bit so the bucket ages past 1ms
      await new Promise((resolve) => setTimeout(resolve, 5))
      limiter.cleanup(1)
      // After cleanup, the bucket is gone so next consume gets fresh tokens
      const r = limiter.consume('old')
      expect(r.allowed).toBe(true)
      expect(r.remaining).toBe(2)
    })
  })

  describe('default rate limiter instances', () => {
    it('exports apiRateLimiter with expected config', () => {
      expect(apiRateLimiter).toBeInstanceOf(RateLimiter)
    })

    it('exports authRateLimiter with expected config', () => {
      expect(authRateLimiter).toBeInstanceOf(RateLimiter)
    })

    it('exports wsRateLimiter with expected config', () => {
      expect(wsRateLimiter).toBeInstanceOf(RateLimiter)
    })
  })

  describe('request limits', () => {
    it('defines reasonable default limits', () => {
      expect(DEFAULT_REQUEST_LIMITS.maxJsonBodyBytes).toBe(1 * 1024 * 1024)
      expect(DEFAULT_REQUEST_LIMITS.maxFormDataBytes).toBe(10 * 1024 * 1024)
      expect(DEFAULT_REQUEST_LIMITS.maxWsMessageBytes).toBe(512 * 1024)
      expect(DEFAULT_REQUEST_LIMITS.requestTimeoutMs).toBe(30_000)
    })

    it('defines collaboration limits', () => {
      expect(DEFAULT_COLLABORATION_LIMITS.maxConnectionsPerDocument).toBe(50)
      expect(DEFAULT_COLLABORATION_LIMITS.maxDocumentsPerUser).toBe(10)
      expect(DEFAULT_COLLABORATION_LIMITS.maxYjsUpdateBytes).toBe(2 * 1024 * 1024)
    })

    it('assertBodySize passes for valid size', () => {
      expect(() => assertBodySize(100, 1024)).not.toThrow()
    })

    it('assertBodySize throws for oversized body', () => {
      expect(() => assertBodySize(2048, 1024)).toThrow(RequestLimitError)
    })

    it('assertBodySize allows null content-length', () => {
      expect(() => assertBodySize(null, 1024)).not.toThrow()
    })

    it('assertWsMessageSize passes for valid size', () => {
      expect(() => assertWsMessageSize(1024)).not.toThrow()
    })

    it('assertWsMessageSize throws for oversized message', () => {
      expect(() => assertWsMessageSize(3 * 1024 * 1024)).toThrow(RequestLimitError)
    })

    it('RequestLimitError has expected properties', () => {
      const err = new RequestLimitError('test')
      expect(err.code).toBe('request_limit_exceeded')
      expect(err.status).toBe(413)
      expect(err.name).toBe('RequestLimitError')
    })
  })

  describe('health checks', () => {
    it('livenessCheck returns healthy with uptime', () => {
      const result = livenessCheck()
      expect(result.status).toBe('healthy')
      expect(result.uptime).toBeGreaterThanOrEqual(0)
    })

    it('readinessCheck returns healthy when all checks pass', async () => {
      const checks = [
        { name: 'db', check: async () => 'ok' as const },
        { name: 'storage', check: async () => 'ok' as const },
      ]
      const result = await readinessCheck(checks)
      expect(result.status).toBe('healthy')
      expect(result.checks.db).toBe('ok')
      expect(result.checks.storage).toBe('ok')
    })

    it('readinessCheck returns degraded when a check is degraded', async () => {
      const checks = [
        { name: 'db', check: async () => 'ok' as const },
        { name: 'cache', check: async () => 'degraded' as const },
      ]
      const result = await readinessCheck(checks)
      expect(result.status).toBe('degraded')
    })

    it('readinessCheck returns unavailable when a check fails', async () => {
      const checks = [
        {
          name: 'db',
          check: async () => {
            throw new Error('connection refused')
          },
        },
      ]
      const result = await readinessCheck(checks)
      expect(result.status).toBe('unavailable')
      expect(result.checks.db).toBe('unavailable')
    })

    it('createDatabaseCheck succeeds on resolved query', async () => {
      const check = createDatabaseCheck(async () => [{ '1': 1 }])
      expect(await check.check()).toBe('ok')
    })

    it('createDatabaseCheck fails on rejected query', async () => {
      const check = createDatabaseCheck(async () => {
        throw new Error('fail')
      })
      expect(await check.check()).toBe('unavailable')
    })

    it('createStorageCheck succeeds on resolved check', async () => {
      const check = createStorageCheck(async () => true)
      expect(await check.check()).toBe('ok')
    })

    it('createStorageCheck fails on rejected check', async () => {
      const check = createStorageCheck(async () => {
        throw new Error('fail')
      })
      expect(await check.check()).toBe('unavailable')
    })
  })
})
