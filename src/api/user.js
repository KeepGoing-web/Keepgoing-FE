import { BASE_URL } from './config'
import { apiFetch, getAuthHeaders, handleResponse } from './http'

export async function updateMyProfile(name) {
  const res = await apiFetch(`${BASE_URL}/users/me`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })

  return handleResponse(res)
}

export async function changeMyPassword(currentPassword, newPassword) {
  const res = await apiFetch(`${BASE_URL}/users/me/change-password`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })

  return handleResponse(res)
}
