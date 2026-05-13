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

function makeAbortError(message = 'Aborted') {
  const err = new Error(message)
  err.name = 'AbortError'
  return err
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

async function refreshSession() {
  if (refreshSessionPromise) {
    return refreshSessionPromise
  }

  refreshSessionPromise = (async () => {
    const res = await fetchWithCredentials(`${BASE_URL}${REFRESH_PATH}`, {
      method: 'POST',
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
  const { skipAuthRefresh = false, signal, ...fetchOptions } = options

  if (signal?.aborted) throw makeAbortError()

  const generationAtStart = authGeneration
  const res = await fetchWithCredentials(url, { ...fetchOptions, signal })

  if (res.status !== 401 || skipAuthRefresh) return res
  if (isRefreshUrl(url)) return res

  try {
    await refreshSession()
  } catch {
    return res
  }

  if (signal?.aborted) throw makeAbortError('Aborted during refresh')
  if (authGeneration !== generationAtStart) return res

  const retriedResponse = await fetchWithCredentials(url, { ...fetchOptions, signal })
  if (retriedResponse.status === 401) {
    dispatchAuthSessionExpired()
  }
  return retriedResponse
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
