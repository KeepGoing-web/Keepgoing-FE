import { BASE_URL, USE_MOCK_API } from './config'
import { apiFetch, buildQuery, delay, getAuthHeaders, handleResponse } from './http'
import { enrichMockNote, MOCK_NOTES, MOCK_USERS } from './mockData'

function normalizePublicNote(note) {
  if (!note) return note
  return {
    ...note,
    id: note.id ?? note.noteId ?? note.postId ?? null,
  }
}

function normalizePublicProfile(profile) {
  if (!profile) return profile
  return {
    ...profile,
    noteCount: profile.noteCount ?? profile.postCount ?? 0,
  }
}

function normalizePublicNotesPage(data, fallbackSize) {
  const rawItems = data.contents || data.notes || data.posts || data.items || []
  const notes = rawItems.map(normalizePublicNote)
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

export async function fetchPublicProfile(username) {
  if (USE_MOCK_API) {
    const mockProfile = {
      username,
      name: '홍길동',
      bio: '풀스택 개발자 | 배움을 멈추지 않는 사람',
      techStack: ['Java', 'Spring Boot', 'React', 'Docker', 'Kubernetes', 'PostgreSQL'],
      noteCount: MOCK_NOTES.filter(
        (note) => note.visibility === 'PUBLIC' || note.visibility === 'AI_COLLECTABLE',
      ).length,
      joinedAt: '2024-01-01T00:00:00Z',
    }

    await delay(200)
    return mockProfile
  }

  const res = await apiFetch(`${BASE_URL}/users/${username}/profile`, {
    headers: getAuthHeaders(),
  })
  const data = await handleResponse(res)
  return normalizePublicProfile(data)
}

export async function fetchPublicNotes(username, params = {}) {
  if (USE_MOCK_API) {
    const { page = 1, size = 10, sort = 'createdAt', order = 'desc' } = params
    const items = MOCK_NOTES
      .filter((note) => note.visibility === 'PUBLIC' || note.visibility === 'AI_COLLECTABLE')
      .map(enrichMockNote)

    items.sort((left, right) => {
      const leftValue = new Date(left[sort]).getTime()
      const rightValue = new Date(right[sort]).getTime()
      return order === 'asc' ? leftValue - rightValue : rightValue - leftValue
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

  const query = buildQuery(params)
  const res = await apiFetch(`${BASE_URL}/users/${username}/notes${query}`, {
    headers: getAuthHeaders(),
  })
  const data = await handleResponse(res)
  return normalizePublicNotesPage(data, params.size ?? 10)
}

export async function fetchPublicNote(username, noteId) {
  if (USE_MOCK_API) {
    const baseNote = MOCK_NOTES.find((note) => note.id === String(noteId))
    await delay(200)

    if (!baseNote || (baseNote.visibility !== 'PUBLIC' && baseNote.visibility !== 'AI_COLLECTABLE')) {
      throw new Error('NOT_FOUND')
    }

    const allPublicNotes = MOCK_NOTES
      .filter((note) => note.visibility === 'PUBLIC' || note.visibility === 'AI_COLLECTABLE')
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    const currentIndex = allPublicNotes.findIndex((note) => note.id === baseNote.id)

    return {
      ...enrichMockNote(baseNote),
      prevNote:
        currentIndex < allPublicNotes.length - 1
          ? { id: allPublicNotes[currentIndex + 1].id, title: allPublicNotes[currentIndex + 1].title }
          : null,
      nextNote:
        currentIndex > 0
          ? { id: allPublicNotes[currentIndex - 1].id, title: allPublicNotes[currentIndex - 1].title }
          : null,
    }
  }

  const res = await apiFetch(`${BASE_URL}/users/${username}/notes/${noteId}`, {
    headers: getAuthHeaders(),
  })

  if (res.status === 404) {
    const error = new Error('NOT_FOUND')
    error.status = 404
    throw error
  }

  const data = await handleResponse(res)
  return normalizePublicNote(data)
}

export async function fetchUsers(params = {}) {
  if (USE_MOCK_API) {
    const { q = '', page = 1, size = 12 } = params
    let items = [...MOCK_USERS]

    if (q) {
      const lowerQuery = q.toLowerCase()
      items = items.filter(
        (user) =>
          user.username.toLowerCase().includes(lowerQuery) ||
          user.name.toLowerCase().includes(lowerQuery) ||
          (user.bio || '').toLowerCase().includes(lowerQuery),
      )
    }

    const start = (page - 1) * size
    const pagedUsers = items.slice(start, start + Number(size))
    const total = items.length
    const totalPages = Math.ceil(total / size) || 1

    await delay(250)
    return {
      users: pagedUsers,
      total,
      page,
      size,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  }

  const query = buildQuery(params)
  const res = await apiFetch(`${BASE_URL}/users${query}`, {
    headers: getAuthHeaders(),
  })
  const data = await handleResponse(res)

  return {
    ...data,
    users: (data.users || data.contents || data.items || []).map((user) => ({
      ...user,
      noteCount: user.noteCount ?? user.postCount ?? 0,
    })),
  }
}
