export const OPEN_AI_PANEL_EVENT = 'kg:open-ai-panel'

export function dispatchOpenAIPanel(detail) {
  window.dispatchEvent(new CustomEvent(OPEN_AI_PANEL_EVENT, { detail }))
}

export function buildRAGWorkspaceHref({ query = '', scope = {} }) {
  const params = new URLSearchParams()

  if (query) params.set('q', query)
  if (scope.mode) params.set('scope', scope.mode)
  if (scope.currentNoteId) params.set('noteId', scope.currentNoteId)
  if (scope.categoryId) params.set('categoryId', scope.categoryId)
  if (scope.aiOnly === false) params.set('aiOnly', 'false')

  const search = params.toString()
  return `/query${search ? `?${search}` : ''}`
}
