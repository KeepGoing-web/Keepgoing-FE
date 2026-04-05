export const NOTE_DRAG_MIME = 'application/x-keepgoing-note'
const NOTE_DRAG_GLOBAL_KEY = '__keepgoingDraggedNote'

function buildDragPayload(note) {
  return {
    id: String(note.id),
    title: note.title || '',
    folderId: note.folderId ?? note.categoryId ?? note.category?.id ?? null,
  }
}

export function setDraggedNote(event, note) {
  const dragPayload = buildDragPayload(note)
  const payload = JSON.stringify(dragPayload)

  globalThis[NOTE_DRAG_GLOBAL_KEY] = dragPayload

  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(NOTE_DRAG_MIME, payload)
  event.dataTransfer.setData('text/plain', note.title || '')
}

export function getDraggedNote(event) {
  const raw = event.dataTransfer?.getData(NOTE_DRAG_MIME)
  if (!raw) {
    return globalThis[NOTE_DRAG_GLOBAL_KEY] ?? null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return globalThis[NOTE_DRAG_GLOBAL_KEY] ?? null
  }
}

export function clearDraggedNote() {
  delete globalThis[NOTE_DRAG_GLOBAL_KEY]
}
