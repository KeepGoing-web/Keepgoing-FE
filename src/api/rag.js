import { fetchNote, fetchNotes } from './client'

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeText(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_-]/g, ' ')
    .replace(/\[|\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(query) {
  return Array.from(
    new Set(
      normalizeText(query)
        .toLowerCase()
        .split(/\s+/)
        .filter((token) => token.length > 1),
    ),
  )
}

function inferSourceType(note) {
  return note.visibility === 'PUBLIC' ? 'blog' : 'memo'
}

function formatTypeLabel(type) {
  return type === 'blog' ? 'Blog' : 'Memo'
}

function buildScopeSummary(scope) {
  switch (scope.mode) {
    case 'notes':
      return '메모 전용 범위에서'
    case 'blogs':
      return '블로그 전용 범위에서'
    case 'current-note':
      return '현재 문서를 우선으로'
    default:
      return '전체 지식베이스에서'
  }
}

function extractSegments(content) {
  return String(content || '')
    .split(/\n{2,}/)
    .map((segment) => normalizeText(segment))
    .filter(Boolean)
}

function pickQuote(note, tokens) {
  const segments = extractSegments(note.content)
  if (segments.length === 0) {
    return {
      text: '본문이 아직 충분하지 않아 직접 인용할 수 있는 문단이 없습니다.',
      anchorLabel: note.title,
      relevance: 0.3,
    }
  }

  const scored = segments.map((segment, index) => {
    const lowered = segment.toLowerCase()
    const tokenHits = tokens.reduce((total, token) => total + (lowered.includes(token) ? 1 : 0), 0)
    const baseScore = tokenHits * 8 + Math.max(0, 180 - Math.abs(segment.length - 180)) / 60

    return {
      id: `${note.id}-quote-${index + 1}`,
      text: segment.slice(0, 220),
      anchorLabel: segment.slice(0, 42),
      relevance: baseScore,
    }
  })

  return scored.sort((left, right) => right.relevance - left.relevance)[0]
}

function scoreNote(note, tokens, scope) {
  const title = String(note.title || '').toLowerCase()
  const content = String(note.content || '').toLowerCase()
  const tagNames = Array.isArray(note.tags) ? note.tags.map((tag) => String(tag.name || '').toLowerCase()) : []
  const categoryName = String(note.category?.name || '').toLowerCase()
  const sourceType = inferSourceType(note)

  let score = 0

  tokens.forEach((token) => {
    if (title.includes(token)) score += 12
    if (content.includes(token)) score += 6
    if (categoryName.includes(token)) score += 5
    if (tagNames.some((tag) => tag.includes(token))) score += 5
  })

  if (scope.mode === 'notes' && sourceType === 'memo') score += 3
  if (scope.mode === 'blogs' && sourceType === 'blog') score += 3
  if (scope.mode === 'current-note' && String(note.id) === String(scope.currentNoteId)) score += 24

  if (scope.categoryId && String(note.category?.id) === String(scope.categoryId)) score += 8
  if (Array.isArray(scope.tagIds) && scope.tagIds.length > 0) {
    const noteTagIds = new Set((note.tags || []).map((tag) => String(tag.id)))
    const overlap = scope.tagIds.filter((tagId) => noteTagIds.has(String(tagId))).length
    score += overlap * 6
  }

  if (note.aiCollectable || note.visibility === 'AI_COLLECTABLE') score += 1.5

  return score
}

function applyScopeFilters(notes, scope) {
  return notes.filter((note) => {
    const sourceType = inferSourceType(note)
    const isAiCollectable = Boolean(note.aiCollectable || note.visibility === 'AI_COLLECTABLE')
    const createdAt = new Date(note.updatedAt || note.createdAt || Date.now()).getTime()

    if (scope.mode === 'notes' && sourceType !== 'memo') return false
    if (scope.mode === 'blogs' && sourceType !== 'blog') return false
    if (scope.aiOnly && !isAiCollectable) return false
    if (scope.categoryId && String(note.category?.id) !== String(scope.categoryId)) return false

    if (Array.isArray(scope.tagIds) && scope.tagIds.length > 0) {
      const noteTagIds = new Set((note.tags || []).map((tag) => String(tag.id)))
      const hasTag = scope.tagIds.some((tagId) => noteTagIds.has(String(tagId)))
      if (!hasTag) return false
    }

    if (scope.dateFrom && createdAt < new Date(scope.dateFrom).getTime()) return false
    if (scope.dateTo && createdAt > new Date(scope.dateTo).getTime()) return false

    return true
  })
}

function createAnswer({ query, sources, quotes, scope }) {
  if (sources.length === 0) {
    return {
      text: `“${query}”에 바로 대응하는 문서를 찾지 못했습니다.\n\n범위를 넓히거나 AI 수집 허용 문서를 늘리면 더 근거 있는 답변을 만들 수 있습니다.`,
      confidence: 'weak',
      citations: [],
      summary: '근거가 부족해 범위 조정이 필요합니다.',
    }
  }

  const topTitles = sources.slice(0, 3).map((source) => source.title).join(', ')
  const leadQuote = quotes[0]?.text || ''
  const secondQuote = quotes[1]?.text || ''

  const text = [
    `${buildScopeSummary(scope)} “${query}”에 가장 가까운 문서는 ${topTitles}입니다.`,
    leadQuote ? `우선 핵심 근거는 “${leadQuote}”라는 문단에 모여 있습니다.` : '',
    secondQuote ? `보강 근거로는 “${secondQuote}”가 이어져, 개념 정리보다 실행 관점의 연결성을 제공합니다.` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  const confidence = sources.length >= 3 ? 'grounded' : 'partial'
  const citations = quotes.slice(0, 3).map((quote, index) => ({
    id: `citation-${index + 1}`,
    sourceId: quote.sourceId,
    quoteId: quote.id,
    label: `${index + 1}`,
  }))

  return {
    text,
    confidence,
    citations,
    summary: `${sources.length}개 문서와 ${quotes.length}개 인용을 바탕으로 정리했습니다.`,
  }
}

export function getRAGScopeLabel(scope) {
  switch (scope?.mode) {
    case 'notes':
      return '메모만'
    case 'blogs':
      return '블로그만'
    case 'current-note':
      return '현재 문서'
    default:
      return '전체 지식베이스'
  }
}

export async function fetchRAGSuggestions(scope = {}) {
  await delay(80)

  if (scope.mode === 'current-note') {
    return [
      '이 문서의 핵심 개념 3가지를 정리해줘',
      '관련된 다른 노트를 찾아줘',
      '이 내용을 블로그 초안 구조로 바꿔줘',
    ]
  }

  if (scope.mode === 'blogs') {
    return [
      '최근 공개 글에서 반복되는 주제를 정리해줘',
      '블로그 초안으로 확장할 만한 메모를 찾아줘',
      '외부 공개용으로 다듬을 만한 문서를 추천해줘',
    ]
  }

  if (scope.mode === 'notes') {
    return [
      '최근 메모 3개를 하나의 흐름으로 요약해줘',
      '비슷한 메모끼리 묶어서 정리해줘',
      '실행 계획으로 바꿔볼 수 있는 메모를 찾아줘',
    ]
  }

  return [
    '최근 노트와 블로그의 공통 주제를 정리해줘',
    'RAG 관련 문서만 기준으로 핵심을 요약해줘',
    '블로그로 확장할 만한 메모를 추천해줘',
  ]
}

export async function queryRAG(payload) {
  const scope = {
    mode: 'all',
    currentNoteId: null,
    categoryId: '',
    tagIds: [],
    aiOnly: true,
    dateFrom: '',
    dateTo: '',
    ...payload.scope,
  }
  const query = String(payload.query || '').trim()
  const tokens = tokenize(query)

  const response = await fetchNotes({ page: 1, size: 200, sort: 'updatedAt', order: 'desc' })
  let notes = response.posts || []

  if (scope.mode === 'current-note' && scope.currentNoteId && !notes.some((note) => String(note.id) === String(scope.currentNoteId))) {
    try {
      const currentNote = await fetchNote(scope.currentNoteId)
      notes = [currentNote, ...notes]
    } catch {
      // ignore unavailable note detail in demo mode
    }
  }

  const scopedNotes = applyScopeFilters(notes, scope)
  const scoredNotes = scopedNotes
    .map((note) => ({
      ...note,
      sourceType: inferSourceType(note),
      ragScore: scoreNote(note, tokens, scope),
    }))
    .sort((left, right) => {
      if (right.ragScore !== left.ragScore) return right.ragScore - left.ragScore
      return new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt)
    })

  const topMatches = scoredNotes.filter((note) => note.ragScore > 0).slice(0, 5)
  const fallbackMatches = topMatches.length > 0 ? topMatches : scoredNotes.slice(0, 3)

  const sources = fallbackMatches.map((note) => ({
    id: String(note.id),
    noteId: String(note.id),
    title: note.title,
    type: note.sourceType,
    typeLabel: formatTypeLabel(note.sourceType),
    relevance: Math.max(0.35, Math.min(0.99, note.ragScore / 24)),
    updatedAt: note.updatedAt || note.createdAt || null,
    tags: (note.tags || []).map((tag) => tag.name),
  }))

  const quotes = fallbackMatches.map((note) => {
    const quote = pickQuote(note, tokens)
    return {
      ...quote,
      sourceId: String(note.id),
    }
  })

  await delay(420)

  return {
    retrieval: {
      scannedCount: scopedNotes.length,
      matchedCount: topMatches.length,
      selectedChunks: quotes.length,
      lastSyncedAt: new Date().toISOString(),
    },
    answer: createAnswer({ query, sources, quotes, scope }),
    sources,
    quotes,
    suggestedActions: [
      { id: 'shorter', label: '더 짧게 요약', prompt: `${query} 답변을 3줄로 압축해줘` },
      { id: 'related', label: '관련 문서 더 찾기', prompt: `${query}와 연결되는 관련 문서를 더 찾아줘` },
      { id: 'blogify', label: '블로그 초안 만들기', prompt: `${query}를 블로그 초안 구조로 바꿔줘` },
    ],
  }
}
