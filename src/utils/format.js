/**
 * Format an ISO date string as YYYY.MM.DD
 */
export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Estimate reading time in minutes from text content.
 * Average Korean reading speed: ~500 chars/min
 */
export function estimateReadTime(text) {
  if (!text) return 0
  const chars = text.replace(/\s/g, '').length
  return Math.max(1, Math.round(chars / 500))
}

/**
 * Count non-whitespace characters in text.
 */
export function countChars(text) {
  if (!text) return 0
  return text.replace(/\s/g, '').length
}
