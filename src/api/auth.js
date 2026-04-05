import { BASE_URL } from './config'
import { apiFetch, getAuthHeaders, handleResponse } from './http'

export async function login(email, password) {
  const res = await apiFetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    skipAuthRefresh: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse(res)
}

export async function signup(email, password, name) {
  const res = await apiFetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    skipAuthRefresh: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  return handleResponse(res)
}

export async function fetchMe() {
  const res = await apiFetch(`${BASE_URL}/users/me`, {
    headers: getAuthHeaders(),
  })
  return handleResponse(res)
}
