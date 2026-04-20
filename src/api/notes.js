import { BASE_URL, USE_BACKEND_POSTS, USE_MOCK_API } from './config'
import { apiFetch, buildQuery, delay, getAuthHeaders, handleResponse } from './http'
import { enrichMockNote, MOCK_NOTES } from './mockData'

const shouldUseMockNotes = USE_MOCK_API && !USE_BACKEND_POSTS
const BACKEND_FETCH_SIZE = 100
const MAX_BACKEND_FETCH_PAGES = 10

function normalizeNote(note) {
  if (!note) return note

  const id = note.id ?? note.noteId ?? note.postId ?? null
  const folderId = note.folderId ?? note.categoryId ?? note.category?.id ?? null

  return {
    ...note,
    id,
    folderId,
    categoryId: folderId,
  }
}

function normalizeOptionalFolderId(folderId) {
  if (folderId === undefined || folderId === null || folderId === '') return null
  const numericFolderId = Number(folderId)
  return Number.isFinite(numericFolderId) ? numericFolderId : folderId
}

function sortNotes(items, sort, order) {
  return [...items].sort((left, right) => {
    let leftValue = left[sort]
    let rightValue = right[sort]

    if (sort === 'createdAt' || sort === 'updatedAt') {
      leftValue = new Date(leftValue || left.createdAt).getTime()
      rightValue = new Date(rightValue || right.createdAt).getTime()
    } else if (sort === 'title') {
      leftValue = String(leftValue || '').toLowerCase()
      rightValue = String(rightValue || '').toLowerCase()
    }

    const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
    return order === 'asc' ? comparison : -comparison
  })
}

function normalizePagedNotes(data, fallbackSize) {
  const rawItems = data.contents || data.notes || data.posts || data.items || []
  const notes = rawItems.map(normalizeNote)
  const pageIndex = data.page ?? data.number ?? 0
  const size = data.size ?? data.pageSize ?? fallbackSize
  const total = data.totalElements ?? data.total ?? notes.length
  const totalPages = data.totalPages ?? (Math.ceil(total / size) || 1)
  const hasNext = data.hasNext ?? (!data.last && pageIndex + 1 < totalPages)
  const hasPrev = data.hasPrev ?? pageIndex > 0

  return {
    notes,
    posts: notes,
    total,
    page: pageIndex + 1,
    size,
    totalPages,
    hasNext,
    hasPrev,
  }
}

async function fetchAllBackendNotes({ q = '', sort = 'createdAt', order = 'desc' }) {
  const endpoint = q ? '/notes/me/search' : '/notes/me'
  const collected = []
  let currentPage = 0
  let hasNext = true

  while (hasNext && currentPage < MAX_BACKEND_FETCH_PAGES) {
    const query = buildQuery({
      ...(q ? { keyword: q } : { sort: `${sort},${order}` }),
      page: currentPage,
      size: BACKEND_FETCH_SIZE,
    })

    const res = await apiFetch(`${BASE_URL}${endpoint}${query}`, {
      headers: getAuthHeaders(),
    })
    const data = await handleResponse(res)
    const normalized = normalizePagedNotes(data, BACKEND_FETCH_SIZE)

    collected.push(...normalized.posts)
    hasNext = normalized.hasNext
    currentPage += 1
  }

  return q ? sortNotes(collected, sort, order) : collected
}

function applyClientFilters(items, params) {
  const {
    categoryId,
    uncategorized,
    visibility,
    aiCollectable,
    dateFrom,
    dateTo,
    sort = 'createdAt',
    order = 'desc',
    page = 1,
    size = 10,
  } = params

  let filtered = [...items]

  if (uncategorized === true || uncategorized === 'true') {
    filtered = filtered.filter((note) => !note.folderId && !note.category?.id)
  } else if (categoryId) {
    filtered = filtered.filter((note) => String(note.folderId || note.category?.id) === String(categoryId))
  }

  if (visibility) {
    filtered = filtered.filter((note) => note.visibility === visibility)
  }

  if (typeof aiCollectable !== 'undefined' && aiCollectable !== '') {
    const flag = aiCollectable === true || aiCollectable === 'true'
    filtered = filtered.filter((note) => Boolean(note.aiCollectable) === flag)
  }

  if (dateFrom) {
    const fromTimestamp = new Date(dateFrom).getTime()
    filtered = filtered.filter((note) => new Date(note.updatedAt || note.createdAt).getTime() >= fromTimestamp)
  }

  if (dateTo) {
    const toTimestamp = new Date(dateTo).getTime()
    filtered = filtered.filter((note) => new Date(note.updatedAt || note.createdAt).getTime() <= toTimestamp)
  }

  filtered = sortNotes(filtered, sort, order)

  const start = (page - 1) * size
  const pagedNotes = filtered.slice(start, start + Number(size))
  const total = filtered.length
  const totalPages = Math.ceil(total / size) || 1

  return {
    notes: pagedNotes,
    posts: pagedNotes,
    total,
    page,
    size,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

export async function fetchNotes(params = {}) {
  if (shouldUseMockNotes) {
    const {
      page = 1,
      size = 10,
      q = '',
      categoryId,
      uncategorized,
      tagId,
      sort = 'createdAt',
      order = 'desc',
      visibility,
      aiCollectable,
      dateFrom,
      dateTo,
    } = params

    let items = MOCK_NOTES.map(enrichMockNote)

    if (q) {
      const lowerQuery = q.toLowerCase()
      items = items.filter(
        (note) =>
          note.title.toLowerCase().includes(lowerQuery) ||
          note.content.toLowerCase().includes(lowerQuery),
      )
    }

    if (uncategorized === true || uncategorized === 'true') {
      items = items.filter((note) => !note.category)
    } else if (categoryId) {
      items = items.filter((note) => note.category && note.category.id === categoryId)
    }

    if (tagId) {
      const tagIdSet = new Set(String(tagId).split(',').filter(Boolean))
      items = items.filter((note) => note.tags.some((tag) => tagIdSet.has(tag.id)))
    }

    if (visibility) {
      items = items.filter((note) => note.visibility === visibility)
    }

    if (typeof aiCollectable !== 'undefined') {
      const flag = aiCollectable === 'true' || aiCollectable === true
      items = items.filter((note) => Boolean(note.aiCollectable) === flag)
    }

    if (dateFrom) {
      const fromTimestamp = new Date(dateFrom).getTime()
      items = items.filter((note) => new Date(note.createdAt).getTime() >= fromTimestamp)
    }

    if (dateTo) {
      const toTimestamp = new Date(dateTo).getTime()
      items = items.filter((note) => new Date(note.createdAt).getTime() <= toTimestamp)
    }

    items = sortNotes(items, sort, order)

    const start = (page - 1) * size
    const pagedNotes = items.slice(start, start + Number(size))
    const total = items.length
    const totalPages = Math.ceil(total / size) || 1

    await delay(300)
    return {
      notes: pagedNotes,
      posts: pagedNotes,
      total,
      page,
      size,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  }

  const {
    page = 1,
    size = 10,
    q = '',
    sort = 'createdAt',
    order = 'desc',
    categoryId,
    uncategorized,
    visibility,
    aiCollectable,
    dateFrom,
    dateTo,
  } = params

  const needsClientFiltering = Boolean(categoryId || uncategorized || visibility || aiCollectable || dateFrom || dateTo)
  const needsLargeClientFetch = Number(size) > BACKEND_FETCH_SIZE

  if (needsClientFiltering || needsLargeClientFetch) {
    const allNotes = await fetchAllBackendNotes({ q, sort, order })
    return applyClientFilters(allNotes, { page, size, categoryId, uncategorized, visibility, aiCollectable, dateFrom, dateTo, sort, order })
  }

  const endpoint = q ? '/notes/me/search' : '/notes/me'
  const query = buildQuery({
    ...(q ? { keyword: q } : { sort: `${sort},${order}` }),
    page: page - 1,
    size,
  })
  const res = await apiFetch(`${BASE_URL}${endpoint}${query}`, {
    headers: getAuthHeaders(),
  })
  const data = await handleResponse(res)
  return normalizePagedNotes(data, size)
}

export async function fetchNote(id) {
  if (shouldUseMockNotes) {
    const mockNote = MOCK_NOTES.find((note) => note.id === String(id))
    await delay(200)

    if (!mockNote) {
      throw new Error('NOT_FOUND')
    }

    return enrichMockNote(mockNote)
  }

  const res = await apiFetch(`${BASE_URL}/notes/${id}`, {
    headers: getAuthHeaders(),
  })

  if (res.status === 404) {
    const error = new Error('NOT_FOUND')
    error.status = 404
    throw error
  }

  const data = await handleResponse(res)
  return normalizeNote(data)
}

export async function createNote(payload) {
  if (shouldUseMockNotes) {
    const now = new Date().toISOString()
    const nextFolderId = payload.folderId ?? payload.categoryId ?? null
    const nextNote = {
      id: String(MOCK_NOTES.length + 1),
      title: payload.title,
      content: payload.content,
      visibility: payload.visibility || 'PUBLIC',
      aiCollectable: Boolean(payload.aiCollectable),
      createdAt: now,
      updatedAt: now,
      categoryId: nextFolderId,
      folderId: nextFolderId,
      tagIds: Array.isArray(payload.tagIds) ? payload.tagIds : [],
    }

    MOCK_NOTES.unshift(nextNote)
    await delay(200)
    return enrichMockNote(nextNote)
  }

  const backendPayload = {
    folderId: payload.folderId ?? payload.categoryId ?? null,
    title: payload.title,
    content: payload.content,
    visibility: payload.visibility || 'PRIVATE',
    aiCollectable: payload.aiCollectable ?? true,
  }

  const res = await apiFetch(`${BASE_URL}/notes`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(backendPayload),
  })
  const data = await handleResponse(res)
  return normalizeNote(data)
}

export async function moveNote(id, folderId) {
  if (shouldUseMockNotes) {
    const index = MOCK_NOTES.findIndex((note) => note.id === String(id))
    if (index === -1) {
      throw new Error('NOT_FOUND')
    }

    const previousNote = MOCK_NOTES[index]
    const nextFolderId = folderId ?? null
    const nextNote = {
      ...previousNote,
      folderId: nextFolderId,
      categoryId: nextFolderId,
      updatedAt: new Date().toISOString(),
    }

    MOCK_NOTES[index] = nextNote
    await delay(150)
    return enrichMockNote(nextNote)
  }

  const normalizedFolderId = normalizeOptionalFolderId(folderId)

  const res = await apiFetch(`${BASE_URL}/notes/${id}/folder`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderId: normalizedFolderId }),
  })

  if (res.status === 404) {
    const error = new Error('NOT_FOUND')
    error.status = 404
    throw error
  }

  const data = await handleResponse(res)
  return normalizeNote(data)
}

export async function updateNote(id, payload) {
  if (shouldUseMockNotes) {
    const index = MOCK_NOTES.findIndex((note) => note.id === String(id))
    if (index === -1) {
      throw new Error('NOT_FOUND')
    }

    const previousNote = MOCK_NOTES[index]
    const nextFolderId = payload.folderId ?? payload.categoryId
    const nextNote = {
      ...previousNote,
      title: payload.title ?? previousNote.title,
      content: payload.content ?? previousNote.content,
      visibility: payload.visibility ?? previousNote.visibility,
      aiCollectable:
        typeof payload.aiCollectable === 'boolean' ? payload.aiCollectable : previousNote.aiCollectable,
      categoryId: nextFolderId !== undefined ? nextFolderId : previousNote.categoryId,
      folderId: nextFolderId !== undefined ? nextFolderId : previousNote.folderId,
      tagIds: Array.isArray(payload.tagIds) ? payload.tagIds : previousNote.tagIds,
      updatedAt: new Date().toISOString(),
    }

    MOCK_NOTES[index] = nextNote
    await delay(200)
    return enrichMockNote(nextNote)
  }

  const backendPayload = {
    title: payload.title,
    content: payload.content,
    visibility: payload.visibility || 'PRIVATE',
    aiCollectable: payload.aiCollectable ?? true,
  }

  const res = await apiFetch(`${BASE_URL}/notes/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(backendPayload),
  })

  if (res.status === 404) {
    const error = new Error('NOT_FOUND')
    error.status = 404
    throw error
  }

  let data = normalizeNote(await handleResponse(res))
  const nextFolderId = payload.folderId ?? payload.categoryId
  if (nextFolderId !== undefined && String(nextFolderId ?? '') !== String(data.folderId ?? '')) {
    data = await moveNote(id, nextFolderId)
  }

  return normalizeNote(data)
}

export async function deleteNote(id) {
  if (shouldUseMockNotes) {
    const index = MOCK_NOTES.findIndex((note) => note.id === String(id))
    if (index === -1) {
      throw new Error('NOT_FOUND')
    }

    MOCK_NOTES.splice(index, 1)
    await delay(150)
    return true
  }

  const res = await apiFetch(`${BASE_URL}/notes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (res.status === 404) {
    const error = new Error('NOT_FOUND')
    error.status = 404
    throw error
  }

  if (!res.ok) {
    throw new Error('노트 삭제 실패')
  }

  return true
}
