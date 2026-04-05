import { AUTH_SESSION_EXPIRED_EVENT, BASE_URL } from './config'

let refreshSessionPromise = null

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function dispatchAuthSessionExpired() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT))
}

export function fetchWithCredentials(url, options = {}) {
  return fetch(url, {
    credentials: 'include',
    ...options,
  })
}

async function refreshSession() {
  if (refreshSessionPromise) {
    return refreshSessionPromise
  }

  refreshSessionPromise = (async () => {
    const res = await fetchWithCredentials(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
    })

    if (!res.ok) {
      dispatchAuthSessionExpired()
      const errorBody = await res.json().catch(() => ({}))
      const error = new Error(errorBody.error?.message || `HTTP ${res.status}`)
      error.status = res.status
      error.code = errorBody.error?.code
      throw error
    }

    return true
  })().finally(() => {
    refreshSessionPromise = null
  })

  return refreshSessionPromise
}

export async function apiFetch(url, options = {}) {
  const { skipAuthRefresh = false, ...fetchOptions } = options
  const res = await fetchWithCredentials(url, fetchOptions)

  if (res.status !== 401 || skipAuthRefresh) {
    return res
  }

  try {
    await refreshSession()
  } catch {
    return res
  }

  const retriedResponse = await fetchWithCredentials(url, fetchOptions)
  if (retriedResponse.status === 401) {
    dispatchAuthSessionExpired()
  }
  return retriedResponse
}

export function getAuthHeaders() {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export function buildQuery(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    searchParams.set(key, String(value))
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

export async function handleResponse(res) {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    const error = new Error(errorBody.error?.message || `HTTP ${res.status}`)
    error.status = res.status
    error.code = errorBody.error?.code
    throw error
  }

  const json = await res.json()
  return json.data !== undefined ? json.data : json
}
