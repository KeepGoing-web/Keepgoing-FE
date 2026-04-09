export const FOLDER_DRAG_MIME = 'application/x-keepgoing-folder'
const FOLDER_DRAG_GLOBAL_KEY = '__keepgoingDraggedFolder'

function buildDragPayload(folder) {
  return {
    id: String(folder.id),
    name: folder.name || '',
    parentId: folder.parentId ?? null,
  }
}

export function setDraggedFolder(event, folder) {
  const dragPayload = buildDragPayload(folder)
  const payload = JSON.stringify(dragPayload)

  globalThis[FOLDER_DRAG_GLOBAL_KEY] = dragPayload

  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData(FOLDER_DRAG_MIME, payload)
  event.dataTransfer.setData('text/plain', folder.name || '')
}

export function getDraggedFolder(event) {
  const raw = event.dataTransfer?.getData(FOLDER_DRAG_MIME)
  if (!raw) {
    return globalThis[FOLDER_DRAG_GLOBAL_KEY] ?? null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return globalThis[FOLDER_DRAG_GLOBAL_KEY] ?? null
  }
}

export function clearDraggedFolder() {
  delete globalThis[FOLDER_DRAG_GLOBAL_KEY]
}
