/**
 * Simple token-bucket rate limiter for HTTP and WebSocket endpoints.
 * Uses in-memory storage; for multi-node deployments, replace with Redis-backed implementation.
 */

export interface RateLimitConfig {
  /** Maximum tokens in the bucket */
  maxTokens: number
  /** Tokens refilled per second */
  refillRate: number
  /** Window for tracking (ms) */
  windowMs?: number
}

interface BucketState {
  tokens: number
  lastRefill: number
}

export class RateLimiter {
  private readonly buckets = new Map<string, BucketState>()
  private readonly maxTokens: number
  private readonly refillRate: number

  constructor(config: RateLimitConfig) {
    this.maxTokens = config.maxTokens
    this.refillRate = config.refillRate
  }

  /**
   * Attempt to consume a token for the given key.
   * Returns { allowed, remaining, retryAfterMs }.
   */
  consume(key: string, tokens = 1): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const now = Date.now()
    let bucket = this.buckets.get(key)

    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: now }
      this.buckets.set(key, bucket)
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000
    const refilled = Math.min(this.maxTokens, bucket.tokens + elapsed * this.refillRate)
    bucket.tokens = refilled
    bucket.lastRefill = now

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens
      return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 }
    }

    const deficit = tokens - bucket.tokens
    const retryAfterMs = Math.ceil((deficit / this.refillRate) * 1000)
    return { allowed: false, remaining: 0, retryAfterMs }
  }

  /**
   * Reset a key's bucket (e.g., after successful auth).
   */
  reset(key: string): void {
    this.buckets.delete(key)
  }

  /**
   * Cleanup expired buckets to prevent memory growth.
   */
  cleanup(maxAgeMs = 60_000): void {
    const now = Date.now()
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > maxAgeMs) {
        this.buckets.delete(key)
      }
    }
  }
}

// --- Default instances ---

/** API endpoint rate limiter: 60 requests/minute per principal */
export const apiRateLimiter = new RateLimiter({ maxTokens: 60, refillRate: 1 })

/** Authentication rate limiter: 10 attempts/minute per IP */
export const authRateLimiter = new RateLimiter({ maxTokens: 10, refillRate: 0.167 })

/** WebSocket connection limiter: 5 connections/minute per IP */
export const wsRateLimiter = new RateLimiter({ maxTokens: 5, refillRate: 0.083 })
