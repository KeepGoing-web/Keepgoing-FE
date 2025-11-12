const BASE_URL = 'http://localhost:8080/api'
const USE_MOCK = true

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getAuthHeaders() {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    searchParams.set(key, String(value))
  })
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

export async function fetchBlogs(params = {}) {
  if (USE_MOCK) {
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
    const categories = MOCK_CATEGORIES
    const tags = MOCK_TAGS
    let items = MOCK_POSTS.map((p) => ({
      ...p,
      category: categories.find((c) => c.id === p.categoryId) || null,
      tags: p.tagIds.map((tid) => tags.find((t) => t.id === tid)).filter(Boolean),
    }))
    if (q) {
      const qLower = q.toLowerCase()
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(qLower) ||
          p.content.toLowerCase().includes(qLower)
      )
    }
    if (categoryId) {
      items = items.filter((p) => p.category && p.category.id === categoryId)
    }
    if (tagId) {
      const idSet = new Set(String(tagId).split(',').filter(Boolean))
      items = items.filter((p) => p.tags.some((t) => idSet.has(t.id)))
    }
    if (visibility) {
      items = items.filter((p) => p.visibility === visibility)
    }
    if (typeof aiCollectable !== 'undefined') {
      const flag = aiCollectable === 'true' || aiCollectable === true
      items = items.filter((p) => !!p.aiCollectable === flag)
    }
    if (dateFrom) {
      const fromTs = new Date(dateFrom).getTime()
      items = items.filter((p) => new Date(p.createdAt).getTime() >= fromTs)
    }
    if (dateTo) {
      const toTs = new Date(dateTo).getTime()
      items = items.filter((p) => new Date(p.createdAt).getTime() <= toTs)
    }
    items.sort((a, b) => {
      let vA = a[sort]
      let vB = b[sort]
      if (sort === 'createdAt' || sort === 'updatedAt') {
        vA = new Date(vA).getTime()
        vB = new Date(vB).getTime()
      } else if (sort === 'title') {
        vA = String(vA).toLowerCase()
        vB = String(vB).toLowerCase()
      }
      const comp = vA < vB ? -1 : vA > vB ? 1 : 0
      return order === 'asc' ? comp : -comp
    })
    const start = (page - 1) * size
    const paged = items.slice(start, start + Number(size))
    const total = items.length
    const totalPages = Math.ceil(total / size) || 1
    await delay(300)
    return {
      posts: paged,
      total,
      page,
      size,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  }
  const query = buildQuery(params)
  const res = await fetch(`${BASE_URL}/blogs${query}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    throw new Error('블로그 목록 조회 실패')
  }
  return res.json()
}

export async function fetchBlog(id) {
  if (USE_MOCK) {
    const base = MOCK_POSTS.find((p) => p.id === String(id))
    await delay(200)
    if (!base) {
      throw new Error('NOT_FOUND')
    }
    return {
      ...base,
      category: MOCK_CATEGORIES.find((c) => c.id === base.categoryId) || null,
      tags: base.tagIds
        .map((tid) => MOCK_TAGS.find((t) => t.id === tid))
        .filter(Boolean),
    }
  }
  const res = await fetch(`${BASE_URL}/blogs/${id}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND')
    throw new Error('블로그 상세 조회 실패')
  }
  return res.json()
}

export async function createBlog(payload) {
  if (USE_MOCK) {
    const id = String(MOCK_POSTS.length + 1)
    const now = new Date().toISOString()
    const item = {
      id,
      title: payload.title,
      content: payload.content,
      visibility: payload.visibility || 'PUBLIC',
      aiCollectable: !!payload.aiCollectable,
      createdAt: now,
      updatedAt: now,
      categoryId: payload.categoryId || null,
      tagIds: Array.isArray(payload.tagIds) ? payload.tagIds : [],
    }
    MOCK_POSTS.unshift(item)
    await delay(200)
    return {
      ...item,
      category: MOCK_CATEGORIES.find((c) => c.id === item.categoryId) || null,
      tags: item.tagIds
        .map((tid) => MOCK_TAGS.find((t) => t.id === tid))
        .filter(Boolean),
    }
  }
  const res = await fetch(`${BASE_URL}/blogs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error('블로그 생성 실패')
  }
  return res.json()
}

export async function updateBlog(id, payload) {
  if (USE_MOCK) {
    const idx = MOCK_POSTS.findIndex((p) => p.id === String(id))
    if (idx === -1) {
      throw new Error('NOT_FOUND')
    }
    const now = new Date().toISOString()
    const prev = MOCK_POSTS[idx]
    const next = {
      ...prev,
      title: payload.title ?? prev.title,
      content: payload.content ?? prev.content,
      visibility: payload.visibility ?? prev.visibility,
      aiCollectable:
        typeof payload.aiCollectable === 'boolean'
          ? payload.aiCollectable
          : prev.aiCollectable,
      categoryId:
        payload.categoryId !== undefined ? payload.categoryId : prev.categoryId,
      tagIds: Array.isArray(payload.tagIds) ? payload.tagIds : prev.tagIds,
      updatedAt: now,
    }
    MOCK_POSTS[idx] = next
    await delay(200)
    return {
      ...next,
      category: MOCK_CATEGORIES.find((c) => c.id === next.categoryId) || null,
      tags: next.tagIds
        .map((tid) => MOCK_TAGS.find((t) => t.id === tid))
        .filter(Boolean),
    }
  }
  const res = await fetch(`${BASE_URL}/blogs/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND')
    throw new Error('블로그 수정 실패')
  }
  return res.json()
}

export async function deleteBlog(id) {
  if (USE_MOCK) {
    const idx = MOCK_POSTS.findIndex((p) => p.id === String(id))
    if (idx === -1) {
      throw new Error('NOT_FOUND')
    }
    MOCK_POSTS.splice(idx, 1)
    await delay(150)
    return true
  }
  const res = await fetch(`${BASE_URL}/blogs/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND')
    throw new Error('블로그 삭제 실패')
  }
  return true
}

export async function fetchCategories(params = {}) {
  if (USE_MOCK) {
    const { q = '' } = params
    let items = MOCK_CATEGORIES
    if (q) {
      const ql = q.toLowerCase()
      items = items.filter((c) => c.name.toLowerCase().includes(ql))
    }
    await delay(120)
    return { categories: items, total: items.length }
  }
  const query = buildQuery(params)
  const res = await fetch(`${BASE_URL}/categories${query}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    throw new Error('카테고리 목록 조회 실패')
  }
  return res.json()
}

export async function fetchTags(params = {}) {
  if (USE_MOCK) {
    const { q = '' } = params
    let items = MOCK_TAGS
    if (q) {
      const ql = q.toLowerCase()
      items = items.filter((t) => t.name.toLowerCase().includes(ql))
    }
    await delay(120)
    return { tags: items, total: items.length }
  }
  const query = buildQuery(params)
  const res = await fetch(`${BASE_URL}/tags${query}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    throw new Error('태그 목록 조회 실패')
  }
  return res.json()
}

// ----- Applications (Job) -----
export async function fetchApplications() {
  if (USE_MOCK) {
    const items = getPersistedApplications()
    await delay(120)
    return { applications: items }
  }
  const res = await fetch(`${BASE_URL}/applications`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('지원 목록 조회 실패')
  return res.json()
}

export async function createApplicationFromUrl(url, notes = '') {
  if (USE_MOCK) {
    const id = `app_${Math.random().toString(36).slice(2, 8)}`
    const now = new Date().toISOString()
    const parsed = mockParseJobUrl(url)
    const next = {
      id,
      url,
      company: parsed.company,
      title: parsed.title,
      source: parsed.source,
      status: 'APPLIED', // APPLIED, INTERVIEW, OFFER, REJECTED, WITHDRAWN
      notes,
      createdAt: now,
      updatedAt: now,
    }
    const arr = getPersistedApplications()
    arr.unshift(next)
    persistApplications(arr)
    await delay(200)
    return next
  }
  const res = await fetch(`${BASE_URL}/applications`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url, notes }),
  })
  if (!res.ok) throw new Error('지원 생성 실패')
  return res.json()
}

export async function updateApplication(id, updates) {
  if (USE_MOCK) {
    const arr = getPersistedApplications()
    const idx = arr.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('NOT_FOUND')
    const now = new Date().toISOString()
    const next = { ...arr[idx], ...updates, updatedAt: now }
    arr[idx] = next
    persistApplications(arr)
    await delay(150)
    return next
  }
  const res = await fetch(`${BASE_URL}/applications/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('지원 업데이트 실패')
  return res.json()
}

export async function deleteApplication(id) {
  if (USE_MOCK) {
    const arr = getPersistedApplications()
    const idx = arr.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('NOT_FOUND')
    arr.splice(idx, 1)
    persistApplications(arr)
    await delay(120)
    return true
  }
  const res = await fetch(`${BASE_URL}/applications/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!res.ok) throw new Error('지원 삭제 실패')
  return true
}

// ---- MOCK DATA ----
const MOCK_CATEGORIES = [
  { id: 'cat_1', name: 'Frontend', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'cat_2', name: 'Backend', createdAt: '2024-01-02T00:00:00Z' },
  { id: 'cat_3', name: 'AI/ML', createdAt: '2024-01-03T00:00:00Z' },
]

const MOCK_TAGS = [
  { id: 'tag_1', name: 'React', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'tag_2', name: 'Node', createdAt: '2024-01-02T00:00:00Z' },
  { id: 'tag_3', name: 'Vite', createdAt: '2024-01-03T00:00:00Z' },
  { id: 'tag_4', name: 'RAG', createdAt: '2024-01-04T00:00:00Z' },
  { id: 'tag_5', name: 'Prompt', createdAt: '2024-01-05T00:00:00Z' },
]

const MOCK_POSTS = [
  {
    id: '1',
    title: '첫 번째 포스트',
    content: '이것은 첫 번째 포스트입니다...',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    visibility: 'PUBLIC',
    aiCollectable: true,
    categoryId: 'cat_1',
    tagIds: ['tag_1', 'tag_3'],
  },
  {
    id: '2',
    title: 'RAG 파이프라인 설계',
    content: 'RAG 시스템 설계에 대한 고찰...',
    createdAt: '2024-01-05T10:00:00Z',
    updatedAt: '2024-01-06T10:00:00Z',
    visibility: 'AI_COLLECTABLE',
    aiCollectable: true,
    categoryId: 'cat_3',
    tagIds: ['tag_4', 'tag_5'],
  },
  {
    id: '3',
    title: '백엔드 성능 최적화',
    content: 'Node 및 DB 튜닝 사례...',
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-02T10:00:00Z',
    visibility: 'PRIVATE',
    aiCollectable: false,
    categoryId: 'cat_2',
    tagIds: ['tag_2'],
  },
]

// ---- MOCK HELPERS (Applications) ----
const APPS_STORAGE_KEY = 'mock_applications'
function getPersistedApplications() {
  try {
    const raw = localStorage.getItem(APPS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}
function persistApplications(arr) {
  localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(arr))
}
function mockParseJobUrl(url) {
  // 매우 단순한 규칙 기반 파서 (사람인/원티드/잡코리아 등)
  try {
    const u = new URL(url)
    const host = u.hostname
    let source = 'OTHER'
    if (host.includes('saramin')) source = 'SARAMIN'
    if (host.includes('wanted')) source = 'WANTED'
    if (host.includes('jobkorea')) source = 'JOBKOREA'
    // 제목/회사명은 실제 크롤 없이 URL 힌트로 생성
    const path = u.pathname.replace(/\/+/g, ' ').trim()
    const guess = decodeURIComponent(path).split(' ').filter(Boolean)
    const titleGuess = guess.slice(-1)[0] || '채용 공고'
    const companyGuess = u.searchParams.get('company') || host.split('.')[0]
    return {
      source,
      title: titleGuess.replace(/[-_]/g, ' '),
      company: (companyGuess || 'Company').replace(/[-_]/g, ' '),
    }
  } catch {
    return { source: 'OTHER', title: '채용 공고', company: 'Company' }
  }
}


