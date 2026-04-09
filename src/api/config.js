function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue
  if (typeof value === 'boolean') return value

  const normalized = String(value).trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return defaultValue
}

function normalizeBaseUrl(value) {
  if (!value) return '/api'
  const normalized = String(value).trim().replace(/\/$/, '')
  return normalized || '/api'
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL

export const BASE_URL = normalizeBaseUrl(configuredBaseUrl)
export const API_ORIGIN = BASE_URL === '/api'
  ? ''
  : (BASE_URL.endsWith('/api') ? BASE_URL.slice(0, -4) : BASE_URL)
export const USE_MOCK_API = parseBoolean(import.meta.env.VITE_USE_MOCK_API, true)
export const USE_BACKEND_POSTS = parseBoolean(import.meta.env.VITE_USE_BACKEND_POSTS, true)
export const AI_DEMO_MODE = parseBoolean(import.meta.env.VITE_ENABLE_AI_DEMO, true)
export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired'
export const GOOGLE_OAUTH_AUTHORIZE_URL = `${API_ORIGIN}/oauth2/authorization/google`
