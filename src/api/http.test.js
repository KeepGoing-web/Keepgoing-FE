import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, getAuthHeaders } from './http'

const originalFetch = globalThis.fetch

beforeEach(() => {
  vi.useRealTimers()
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('getAuthHeaders', () => {
  it('does not read legacy localStorage tokens for cookie-based auth', () => {
    localStorage.setItem('token', 'legacy-token')
    localStorage.setItem('refreshToken', 'legacy-refresh')

    expect(getAuthHeaders()).toEqual({})
  })
})

describe('apiFetch', () => {
  it('aborts a request after the configured timeout', async () => {
    vi.useFakeTimers()
    globalThis.fetch.mockImplementation((_url, options = {}) => new Promise((_, reject) => {
      options.signal?.addEventListener('abort', () => reject(options.signal.reason), { once: true })
    }))

    const request = apiFetch('/api/users/me', { timeoutMs: 1000 })
    const assertion = expect(request).rejects.toMatchObject({
      name: 'AbortError',
      code: 'REQUEST_TIMEOUT',
    })

    await vi.advanceTimersByTimeAsync(1000)

    await assertion
  })
})
