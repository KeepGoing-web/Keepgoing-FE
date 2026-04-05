import { BASE_URL, USE_MOCK_API } from './config'
import { apiFetch, delay, getAuthHeaders } from './http'
import { getPersistedApplications, mockParseJobUrl, persistApplications } from './mockData'

export async function fetchApplications() {
  if (USE_MOCK_API) {
    const items = getPersistedApplications()
    await delay(120)
    return { applications: items }
  }

  const res = await apiFetch(`${BASE_URL}/applications`, {
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error('지원 목록 조회 실패')
  }

  return res.json()
}

export async function createApplicationFromUrl(url, notes = '') {
  if (USE_MOCK_API) {
    const now = new Date().toISOString()
    const parsed = mockParseJobUrl(url)
    const nextApplication = {
      id: `app_${Math.random().toString(36).slice(2, 8)}`,
      url,
      company: parsed.company,
      title: parsed.title,
      source: parsed.source,
      status: 'APPLIED',
      notes,
      createdAt: now,
      updatedAt: now,
    }

    const applications = getPersistedApplications()
    applications.unshift(nextApplication)
    persistApplications(applications)
    await delay(200)
    return nextApplication
  }

  const res = await apiFetch(`${BASE_URL}/applications`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url, notes }),
  })

  if (!res.ok) {
    throw new Error('지원 생성 실패')
  }

  return res.json()
}

export async function updateApplication(id, updates) {
  if (USE_MOCK_API) {
    const applications = getPersistedApplications()
    const index = applications.findIndex((application) => application.id === id)

    if (index === -1) {
      throw new Error('NOT_FOUND')
    }

    const nextApplication = {
      ...applications[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    applications[index] = nextApplication
    persistApplications(applications)
    await delay(150)
    return nextApplication
  }

  const res = await apiFetch(`${BASE_URL}/applications/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  })

  if (!res.ok) {
    throw new Error('지원 업데이트 실패')
  }

  return res.json()
}

export async function deleteApplication(id) {
  if (USE_MOCK_API) {
    const applications = getPersistedApplications()
    const index = applications.findIndex((application) => application.id === id)

    if (index === -1) {
      throw new Error('NOT_FOUND')
    }

    applications.splice(index, 1)
    persistApplications(applications)
    await delay(120)
    return true
  }

  const res = await apiFetch(`${BASE_URL}/applications/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error('지원 삭제 실패')
  }

  return true
}
