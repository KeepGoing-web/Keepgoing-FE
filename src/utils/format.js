/**
 * Format an ISO date string as YYYY.MM.DD
 */
export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Estimate reading time from text content.
 * Average Korean reading speed: ~500 chars/min
 * Returns { minutes: number, label: string } for i18n flexibility.
 */
export function estimateReadTime(text) {
  if (!text) return { minutes: 1, label: '1분 미만' }
  const chars = text.replace(/\s/g, '').length
  const minutes = Math.round(chars / 500)
  if (minutes < 1) return { minutes: 1, label: '1분 미만' }
  return { minutes, label: `읽기 ${minutes}분` }
}

/**
 * Returns only the display label from estimateReadTime.
 * Convenience helper for callsites that just need the string.
 */
export function formatReadTime(text) {
  return estimateReadTime(text).label
}

/**
 * Count non-whitespace characters in text.
 */
export function countChars(text) {
  if (!text) return 0
  return text.replace(/\s/g, '').length
}
