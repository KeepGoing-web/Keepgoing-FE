import { BASE_URL, USE_BACKEND_POSTS, USE_MOCK_API } from './config'
import { apiFetch, buildQuery, delay, getAuthHeaders, handleResponse } from './http'
import { enrichMockNote, MOCK_NOTES } from './mockData'

const shouldUseMockNotes = USE_MOCK_API && !USE_BACKEND_POSTS

function normalizeNote(note) {
  if (!note) return note

  return {
    ...note,
    id: note.id ?? note.noteId ?? note.postId ?? null,
  }
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

export async function fetchNotes(params = {}) {
  if (shouldUseMockNotes) {
    const {
      page = 1,
      size = 10,
      q = '',
      categoryId,
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

    if (categoryId) {
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

    items.sort((left, right) => {
      let leftValue = left[sort]
      let rightValue = right[sort]

      if (sort === 'createdAt' || sort === 'updatedAt') {
        leftValue = new Date(leftValue).getTime()
        rightValue = new Date(rightValue).getTime()
      } else if (sort === 'title') {
        leftValue = String(leftValue).toLowerCase()
        rightValue = String(rightValue).toLowerCase()
      }

      const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
      return order === 'asc' ? comparison : -comparison
    })

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

  const { page = 1, size = 10, q = '', sort = 'createdAt', order = 'desc' } = params
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
    const nextNote = {
      id: String(MOCK_NOTES.length + 1),
      title: payload.title,
      content: payload.content,
      visibility: payload.visibility || 'PUBLIC',
      aiCollectable: Boolean(payload.aiCollectable),
      createdAt: now,
      updatedAt: now,
      categoryId: payload.categoryId || null,
      tagIds: Array.isArray(payload.tagIds) ? payload.tagIds : [],
    }

    MOCK_NOTES.unshift(nextNote)
    await delay(200)
    return enrichMockNote(nextNote)
  }

  const backendPayload = {
    title: payload.title,
    content: payload.content,
    visibility: payload.visibility || 'PRIVATE',
    aiCollectable: payload.aiCollectable ?? true,
  }

  const res = await apiFetch(`${BASE_URL}/notes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(backendPayload),
  })
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
    const nextNote = {
      ...previousNote,
      title: payload.title ?? previousNote.title,
      content: payload.content ?? previousNote.content,
      visibility: payload.visibility ?? previousNote.visibility,
      aiCollectable:
        typeof payload.aiCollectable === 'boolean' ? payload.aiCollectable : previousNote.aiCollectable,
      categoryId: payload.categoryId !== undefined ? payload.categoryId : previousNote.categoryId,
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
    headers: getAuthHeaders(),
    body: JSON.stringify(backendPayload),
  })

  if (res.status === 404) {
    const error = new Error('NOT_FOUND')
    error.status = 404
    throw error
  }

  const data = await handleResponse(res)
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
