import { afterEach, describe, expect, it } from 'vitest'

import { hasValidInternalKey } from '../../../services/collaboration/src/http/collab-routes'

const originalInternalKey = process.env.INTERNAL_API_KEY

afterEach(() => {
  if (originalInternalKey == null) {
    delete process.env.INTERNAL_API_KEY
  } else {
    process.env.INTERNAL_API_KEY = originalInternalKey
  }
})

describe('collaboration internal request authentication', () => {
  it('fails closed when the service key is not configured', () => {
    delete process.env.INTERNAL_API_KEY

    expect(hasValidInternalKey({ get: () => '' })).toBe(false)
  })

  it('rejects a different header value', () => {
    process.env.INTERNAL_API_KEY = 'expected-key'

    expect(hasValidInternalKey({ get: () => 'wrong-key' })).toBe(false)
  })

  it('accepts the configured internal header value', () => {
    process.env.INTERNAL_API_KEY = 'expected-key'

    expect(hasValidInternalKey({ get: () => 'expected-key' })).toBe(true)
  })
})
