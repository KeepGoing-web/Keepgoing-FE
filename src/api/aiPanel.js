import { BASE_URL } from './config'
import { apiFetch, getAuthHeaders, handleResponse } from './http'

function normalizeContextNoteId(contextNoteId) {
  if (contextNoteId === undefined || contextNoteId === null || contextNoteId === '') {
    return null
  }

  const numericContextNoteId = Number(contextNoteId)
  return Number.isFinite(numericContextNoteId) ? numericContextNoteId : contextNoteId
}

export async function sendAiPanelMessage({ message, contextNoteId = null }) {
  const res = await apiFetch(`${BASE_URL}/ai/panel/messages`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      contextNoteId: normalizeContextNoteId(contextNoteId),
    }),
  })

  return handleResponse(res)
}
