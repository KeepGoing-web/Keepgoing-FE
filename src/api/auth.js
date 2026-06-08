import { BASE_URL } from './config'
import { apiFetch, getAuthHeaders, handleResponse } from './http'

const AUTH_REQUEST_TIMEOUT_MS = 10_000
const SESSION_REQUEST_TIMEOUT_MS = 8_000

export async function login(email, password) {
  const res = await apiFetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    skipAuthRefresh: true,
    timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse(res)
}

export async function signup(email, password, name) {
  const res = await apiFetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    skipAuthRefresh: true,
    timeoutMs: AUTH_REQUEST_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  return handleResponse(res)
}

export async function fetchMe() {
  const res = await apiFetch(`${BASE_URL}/users/me`, {
    timeoutMs: SESSION_REQUEST_TIMEOUT_MS,
    headers: getAuthHeaders(),
  })
  return handleResponse(res)
}
