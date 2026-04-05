import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

afterEach(() => {
  cleanup()
  globalThis.localStorage?.clear?.()
})

beforeAll(() => {
  if (!globalThis.localStorage || typeof globalThis.localStorage.clear !== 'function') {
    let store = {}

    globalThis.localStorage = {
      getItem: (key) => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = String(value)
      },
      removeItem: (key) => {
        delete store[key]
      },
      clear: () => {
        store = {}
      },
    }
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn()
  }
})
