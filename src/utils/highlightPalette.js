export const NOTE_HIGHLIGHT_PALETTE = [
  { id: 'yellow', label: '노랑', color: 'rgba(250, 224, 118, 0.32)' },
  { id: 'green', label: '초록', color: 'rgba(134, 239, 172, 0.26)' },
  { id: 'blue', label: '파랑', color: 'rgba(125, 211, 252, 0.24)' },
  { id: 'purple', label: '보라', color: 'rgba(196, 181, 253, 0.26)' },
  { id: 'red', label: '빨강', color: 'rgba(253, 164, 175, 0.26)' },
]

export const DEFAULT_NOTE_HIGHLIGHT_ID = NOTE_HIGHLIGHT_PALETTE[0].id
export const DEFAULT_NOTE_HIGHLIGHT_COLOR = NOTE_HIGHLIGHT_PALETTE[0].color

const SPAN_WITH_STYLE_PATTERN = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi
const RAW_HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/gi

function normalizeColorValue(value = '') {
  return String(value).trim().replace(/;$/, '').replace(/\s+/g, ' ').toLowerCase()
}

function escapeRawHtmlTag(tag) {
  return tag.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function getStyleValue(attributes, propertyName) {
  const styleMatch = attributes.match(/\bstyle=(["'])(.*?)\1/i)

  if (!styleMatch) return null

  const remainingAttributes = attributes.replace(styleMatch[0], '').trim()
  if (remainingAttributes) return null

  const declarations = styleMatch[2]
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)

  if (declarations.length !== 1) return null

  const [property, rawValue = ''] = declarations[0].split(/:(.+)/)
  if (!property || property.trim().toLowerCase() !== propertyName) return null

  return normalizeColorValue(rawValue)
}

export function findNoteHighlightByColor(color) {
  const normalizedColor = normalizeColorValue(color)
  return NOTE_HIGHLIGHT_PALETTE.find((entry) => normalizeColorValue(entry.color) === normalizedColor) ?? null
}

export function prepareMarkdownForRender(content = '') {
  if (!content) return ''

  const placeholders = []

  const withPlaceholders = content.replace(SPAN_WITH_STYLE_PATTERN, (match, attributes, innerContent) => {
    const backgroundColor = getStyleValue(attributes, 'background-color')
    const highlight = findNoteHighlightByColor(backgroundColor)

    if (!highlight) return match

    const placeholderIndex = placeholders.push(highlight.id) - 1
    return `@@KG_NOTE_HL_OPEN_${placeholderIndex}@@${innerContent}@@KG_NOTE_HL_CLOSE_${placeholderIndex}@@`
  })

  const escapedHtml = withPlaceholders.replace(RAW_HTML_TAG_PATTERN, escapeRawHtmlTag)

  return placeholders.reduce((result, highlightId, placeholderIndex) => {
    const openToken = `@@KG_NOTE_HL_OPEN_${placeholderIndex}@@`
    const closeToken = `@@KG_NOTE_HL_CLOSE_${placeholderIndex}@@`

    return result
      .replaceAll(openToken, `<mark data-note-highlight="${highlightId}">`)
      .replaceAll(closeToken, '</mark>')
  }, escapedHtml)
}
