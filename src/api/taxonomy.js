import { BASE_URL, USE_MOCK_API } from './config'
import { apiFetch, buildQuery, delay, getAuthHeaders } from './http'
import { MOCK_CATEGORIES, MOCK_TAGS } from './mockData'

export async function fetchCategories(params = {}) {
  if (USE_MOCK_API) {
    const { q = '' } = params
    let items = MOCK_CATEGORIES

    if (q) {
      const lowerQuery = q.toLowerCase()
      items = items.filter((category) => category.name.toLowerCase().includes(lowerQuery))
    }

    await delay(120)
    return { categories: items, total: items.length }
  }

  const query = buildQuery(params)
  const res = await apiFetch(`${BASE_URL}/categories${query}`, {
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error('카테고리 목록 조회 실패')
  }

  return res.json()
}

export async function createCategory(name, parentId = null) {
  if (USE_MOCK_API) {
    const nextCategory = {
      id: `cat_${Date.now()}`,
      name,
      parentId,
      createdAt: new Date().toISOString(),
    }

    MOCK_CATEGORIES.push(nextCategory)
    await delay(100)
    return nextCategory
  }

  const res = await apiFetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentId }),
  })

  if (!res.ok) {
    throw new Error('카테고리 생성 실패')
  }

  return res.json()
}

export async function fetchTags(params = {}) {
  if (USE_MOCK_API) {
    const { q = '' } = params
    let items = MOCK_TAGS

    if (q) {
      const lowerQuery = q.toLowerCase()
      items = items.filter((tag) => tag.name.toLowerCase().includes(lowerQuery))
    }

    await delay(120)
    return { tags: items, total: items.length }
  }

  const query = buildQuery(params)
  const res = await apiFetch(`${BASE_URL}/tags${query}`, {
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error('태그 목록 조회 실패')
  }

  return res.json()
}

export async function createTag(name) {
  if (USE_MOCK_API) {
    const nextTag = {
      id: `tag_${Date.now()}`,
      name,
    }

    MOCK_TAGS.push(nextTag)
    await delay(150)
    return nextTag
  }

  const res = await apiFetch(`${BASE_URL}/tags`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })

  if (!res.ok) {
    throw new Error('태그 생성 실패')
  }

  return res.json()
}
