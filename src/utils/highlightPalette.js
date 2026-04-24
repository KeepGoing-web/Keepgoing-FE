export const NOTE_HIGHLIGHT_PALETTE = [
  { id: 'yellow', label: '노랑', color: 'rgba(250, 224, 118, 0.32)' },
  { id: 'green', label: '초록', color: 'rgba(134, 239, 172, 0.26)' },
  { id: 'blue', label: '파랑', color: 'rgba(125, 211, 252, 0.24)' },
  { id: 'purple', label: '보라', color: 'rgba(196, 181, 253, 0.26)' },
  { id: 'red', label: '빨강', color: 'rgba(253, 164, 175, 0.26)' },
]

export const NOTE_TEXT_COLOR_PALETTE = [
  { id: 'blue', label: '파랑', color: '#8aadf4' },
  { id: 'green', label: '초록', color: '#a6da95' },
  { id: 'yellow', label: '노랑', color: '#eed49f' },
  { id: 'orange', label: '주황', color: '#f5a97f' },
  { id: 'red', label: '빨강', color: '#ed8796' },
  { id: 'purple', label: '보라', color: '#c6a0f6' },
]

export const DEFAULT_NOTE_HIGHLIGHT_ID = NOTE_HIGHLIGHT_PALETTE[0].id
export const DEFAULT_NOTE_HIGHLIGHT_COLOR = NOTE_HIGHLIGHT_PALETTE[0].color
export const DEFAULT_NOTE_TEXT_COLOR = NOTE_TEXT_COLOR_PALETTE[0].color

const SPAN_WITH_STYLE_PATTERN = /<span\b([^>]*)>([\s\S]*?)<\/span>/gi
const FENCED_CODE_BLOCK_PATTERN = /(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2[ \t]*(?=\n|$)/g
const INLINE_CODE_PATTERN = /(`+)([\s\S]*?)\1/g
const ANGLE_BRACKET_AUTOLINK_PATTERN = /<(?:https?:\/\/|ftp:\/\/|mailto:)[^<>\s]+>|<[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}>/gi
const RAW_HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/gi

function normalizeColorValue(value = '') {
  return String(value).trim().replace(/;$/, '').replace(/\s+/g, ' ').toLowerCase()
}

function escapeRawHtmlTag(tag) {
  return tag.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function protectMarkdownSegment(segment, segments) {
  const segmentIndex = segments.push(segment) - 1
  return `@@KG_MARKDOWN_SEGMENT_${segmentIndex}@@`
}

function restoreProtectedMarkdownSegments(content, segments) {
  return segments.reduce(
    (result, segment, segmentIndex) => result.replaceAll(`@@KG_MARKDOWN_SEGMENT_${segmentIndex}@@`, segment),
    content,
  )
}

function getTrustedSpanStyle(attributes) {
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
  if (!property) return null

  return {
    propertyName: property.trim().toLowerCase(),
    value: normalizeColorValue(rawValue),
  }
}

export function findNoteHighlightByColor(color) {
  const normalizedColor = normalizeColorValue(color)
  return NOTE_HIGHLIGHT_PALETTE.find((entry) => normalizeColorValue(entry.color) === normalizedColor) ?? null
}

export function findNoteTextColorByColor(color) {
  const normalizedColor = normalizeColorValue(color)
  return NOTE_TEXT_COLOR_PALETTE.find((entry) => normalizeColorValue(entry.color) === normalizedColor) ?? null
}

export function prepareMarkdownForRender(content = '') {
  if (!content) return ''

  const placeholders = []
  const protectedMarkdownSegments = []

  const withProtectedCodeBlocks = content.replace(FENCED_CODE_BLOCK_PATTERN, (match, leadingNewline = '') => {
    const segment = leadingNewline ? match.slice(leadingNewline.length) : match
    return `${leadingNewline}${protectMarkdownSegment(segment, protectedMarkdownSegments)}`
  })

  const withProtectedInlineCode = withProtectedCodeBlocks.replace(
    INLINE_CODE_PATTERN,
    (match) => protectMarkdownSegment(match, protectedMarkdownSegments),
  )

  const withPlaceholders = withProtectedInlineCode.replace(SPAN_WITH_STYLE_PATTERN, (match, attributes, innerContent) => {
    const style = getTrustedSpanStyle(attributes)
    if (!style) return match

    if (style.propertyName === 'background-color') {
      const highlight = findNoteHighlightByColor(style.value)
      if (!highlight) return match

      const placeholderIndex = placeholders.push({ tagName: 'mark', attributeName: 'data-note-highlight', id: highlight.id }) - 1
      return `@@KG_NOTE_STYLE_OPEN_${placeholderIndex}@@${innerContent}@@KG_NOTE_STYLE_CLOSE_${placeholderIndex}@@`
    }

    if (style.propertyName === 'color') {
      const textColor = findNoteTextColorByColor(style.value)
      if (!textColor) return match

      const placeholderIndex = placeholders.push({ tagName: 'span', attributeName: 'data-note-color', id: textColor.id }) - 1
      return `@@KG_NOTE_STYLE_OPEN_${placeholderIndex}@@${innerContent}@@KG_NOTE_STYLE_CLOSE_${placeholderIndex}@@`
    }

    return match
  })

  const withProtectedAutolinks = withPlaceholders.replace(
    ANGLE_BRACKET_AUTOLINK_PATTERN,
    (match) => protectMarkdownSegment(match, protectedMarkdownSegments),
  )

  const escapedHtml = withProtectedAutolinks.replace(RAW_HTML_TAG_PATTERN, escapeRawHtmlTag)
  const restoredMarkdown = restoreProtectedMarkdownSegments(escapedHtml, protectedMarkdownSegments)

  return placeholders.reduce((result, placeholder, placeholderIndex) => {
    const openToken = `@@KG_NOTE_STYLE_OPEN_${placeholderIndex}@@`
    const closeToken = `@@KG_NOTE_STYLE_CLOSE_${placeholderIndex}@@`

    return result
      .replaceAll(openToken, `<${placeholder.tagName} ${placeholder.attributeName}="${placeholder.id}">`)
      .replaceAll(closeToken, `</${placeholder.tagName}>`)
  }, restoredMarkdown)
}
