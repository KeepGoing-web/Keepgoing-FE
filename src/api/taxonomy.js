import { BASE_URL, USE_BACKEND_POSTS, USE_MOCK_API } from './config'
import { apiFetch, delay, getAuthHeaders, handleResponse } from './http'
import { MOCK_CATEGORIES, MOCK_TAGS } from './mockData'

const shouldUseMockTaxonomy = USE_MOCK_API && !USE_BACKEND_POSTS

function flattenFolderTree(nodes = [], accumulator = []) {
  nodes.forEach((node) => {
    accumulator.push({
      id: String(node.folderId),
      name: node.name,
      parentId: node.parentId != null ? String(node.parentId) : null,
    })

    if (Array.isArray(node.children) && node.children.length > 0) {
      flattenFolderTree(node.children, accumulator)
    }
  })

  return accumulator
}

export async function fetchCategories(params = {}) {
  if (shouldUseMockTaxonomy) {
    const { q = '' } = params
    let items = [...MOCK_CATEGORIES]

    if (q) {
      const lowerQuery = q.toLowerCase()
      items = items.filter((category) => category.name.toLowerCase().includes(lowerQuery))
    }

    await delay(120)
    return {
      categories: items.map((category) => ({ ...category })),
      total: items.length,
    }
  }

  const res = await apiFetch(`${BASE_URL}/folders/tree`, {
    headers: getAuthHeaders(),
  })
  const data = await handleResponse(res)
  let categories = flattenFolderTree(data)

  if (params.q) {
    const lowerQuery = String(params.q).toLowerCase()
    categories = categories.filter((category) => category.name.toLowerCase().includes(lowerQuery))
  }

  return { categories, total: categories.length }
}

export async function createCategory(name, parentId = null) {
  if (shouldUseMockTaxonomy) {
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

  const res = await apiFetch(`${BASE_URL}/folders`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parentId }),
  })
  const data = await handleResponse(res)

  return {
    id: String(data.folderId),
    name: data.name,
    parentId: data.parentId != null ? String(data.parentId) : null,
  }
}

export async function renameCategory(id, name) {
  if (shouldUseMockTaxonomy) {
    const category = MOCK_CATEGORIES.find((item) => String(item.id) === String(id))

    if (!category) {
      throw new Error('폴더를 찾을 수 없습니다.')
    }

    category.name = name
    await delay(100)
    return { ...category }
  }

  const res = await apiFetch(`${BASE_URL}/folders/${id}`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  const data = await handleResponse(res)

  return {
    id: String(data.folderId),
    name: data.name,
    parentId: data.parentId != null ? String(data.parentId) : null,
  }
}

export async function deleteCategory(id) {
  if (shouldUseMockTaxonomy) {
    const index = MOCK_CATEGORIES.findIndex((item) => String(item.id) === String(id))

    if (index === -1) {
      throw new Error('폴더를 찾을 수 없습니다.')
    }

    MOCK_CATEGORIES.splice(index, 1)
    await delay(100)
    return true
  }

  const res = await apiFetch(`${BASE_URL}/folders/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (res.status === 204) {
    return true
  }

  await handleResponse(res)
  return true
}

export async function moveCategory(id, parentId) {
  if (shouldUseMockTaxonomy) {
    const category = MOCK_CATEGORIES.find((item) => String(item.id) === String(id))

    if (!category) {
      throw new Error('폴더를 찾을 수 없습니다.')
    }

    category.parentId = parentId != null ? String(parentId) : null
    await delay(100)
    return { ...category }
  }

  const res = await apiFetch(`${BASE_URL}/folders/${id}/parent`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentId }),
  })
  const data = await handleResponse(res)

  return {
    id: String(data.folderId),
    name: data.name,
    parentId: data.parentId != null ? String(data.parentId) : null,
  }
}

export async function fetchTags(params = {}) {
  if (shouldUseMockTaxonomy) {
    const { q = '' } = params
    let items = MOCK_TAGS

    if (q) {
      const lowerQuery = q.toLowerCase()
      items = items.filter((tag) => tag.name.toLowerCase().includes(lowerQuery))
    }

    await delay(120)
    return { tags: items, total: items.length }
  }

  return { tags: [], total: 0 }
}

export async function createTag(name) {
  if (shouldUseMockTaxonomy) {
    const nextTag = {
      id: `tag_${Date.now()}`,
      name,
    }

    MOCK_TAGS.push(nextTag)
    await delay(150)
    return nextTag
  }

  return { id: `tag_${Date.now()}`, name }
}
