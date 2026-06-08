import { AUTH_SESSION_EXPIRED_EVENT, BASE_URL } from './config'

const REFRESH_PATH = '/auth/refresh'

let refreshSessionPromise = null
let authGeneration = 0

export function bumpAuthGeneration() {
  authGeneration += 1
  return authGeneration
}

export function getAuthGeneration() {
  return authGeneration
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function dispatchAuthSessionExpired() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT))
}

export function fetchWithCredentials(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include',
  })
}

function makeAbortError(message = 'Aborted', code) {
  const err = new Error(message)
  err.name = 'AbortError'
  if (code) err.code = code
  return err
}

function getAbortError(signal, fallbackMessage = 'Aborted') {
  if (signal?.reason instanceof Error) return signal.reason
  return makeAbortError(fallbackMessage)
}

function createManagedSignal(externalSignal, timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0) {
    return {
      signal: externalSignal,
      cleanup: () => {},
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(makeAbortError(`Request timed out after ${timeoutMs}ms`, 'REQUEST_TIMEOUT'))
  }, timeoutMs)

  const abortFromExternalSignal = () => {
    if (controller.signal.aborted) return
    controller.abort(getAbortError(externalSignal))
  }

  if (externalSignal?.aborted) {
    abortFromExternalSignal()
  } else {
    externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true })
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId)
      externalSignal?.removeEventListener('abort', abortFromExternalSignal)
    },
  }
}

function waitForAbortablePromise(promise, signal) {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(getAbortError(signal))

  return new Promise((resolve, reject) => {
    const handleAbort = () => reject(getAbortError(signal))
    signal.addEventListener('abort', handleAbort, { once: true })

    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', handleAbort)
    })
  })
}

function isRefreshUrl(url) {
  if (typeof url !== 'string') return false
  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const u = new URL(url, base)
    return u.pathname.endsWith(REFRESH_PATH)
  } catch {
    return url.endsWith(REFRESH_PATH)
  }
}

async function refreshSession(signal) {
  if (refreshSessionPromise) {
    return waitForAbortablePromise(refreshSessionPromise, signal)
  }

  refreshSessionPromise = (async () => {
    if (signal?.aborted) throw getAbortError(signal)

    const res = await fetchWithCredentials(`${BASE_URL}${REFRESH_PATH}`, {
      method: 'POST',
      signal,
    })

    if (!res.ok) {
      dispatchAuthSessionExpired()
      const errorBody = await res.json().catch(() => null)
      const error = new Error(errorBody?.error?.message || `HTTP ${res.status}`)
      error.status = res.status
      error.code = errorBody?.error?.code
      throw error
    }

    return true
  })().finally(() => {
    refreshSessionPromise = null
  })

  return refreshSessionPromise
}

export async function apiFetch(url, options = {}) {
  const { skipAuthRefresh = false, signal: externalSignal, timeoutMs, ...fetchOptions } = options
  const { signal, cleanup } = createManagedSignal(externalSignal, timeoutMs)

  try {
    if (signal?.aborted) throw getAbortError(signal)

    const generationAtStart = authGeneration
    const res = await fetchWithCredentials(url, { ...fetchOptions, signal })

    if (res.status !== 401 || skipAuthRefresh) return res
    if (isRefreshUrl(url)) return res

    try {
      await refreshSession(signal)
    } catch (error) {
      if (signal?.aborted) throw error
      return res
    }

    if (signal?.aborted) throw getAbortError(signal, 'Aborted during refresh')
    if (authGeneration !== generationAtStart) return res

    const retriedResponse = await fetchWithCredentials(url, { ...fetchOptions, signal })
    if (retriedResponse.status === 401) {
      dispatchAuthSessionExpired()
    }
    return retriedResponse
  } finally {
    cleanup()
  }
}

export function getAuthHeaders() {
  return {}
}

export function buildQuery(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === undefined || item === null || item === '') return
        searchParams.append(key, String(item))
      })
      return
    }
    searchParams.set(key, String(value))
  })
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

export async function handleResponse(res) {
  if (!res.ok) {
    let errorBody = null
    try {
      errorBody = await res.json()
    } catch {
      // Not a JSON error body
    }
    const error = new Error(errorBody?.error?.message || `HTTP ${res.status}`)
    error.status = res.status
    error.code = errorBody?.error?.code
    throw error
  }

  if (res.status === 204 || res.status === 205) return null

  const text = await res.text()
  if (!text) return null

  try {
    const json = JSON.parse(text)
    if (json && typeof json === 'object' && 'data' in json) return json.data
    return json
  } catch (e) {
    console.error('[http] Failed to parse JSON response:', e, text.slice(0, 100))
    return null
  }
}
