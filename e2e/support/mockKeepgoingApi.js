import { expect } from '@playwright/test'

export const TEST_CREDENTIALS = {
  email: process.env.E2E_EMAIL || 'test@test.com',
  password: process.env.E2E_PASSWORD || 'Qwer1234!',
}

export const mockUser = {
  userId: 'user-1',
  id: 'user-1',
  name: '테스트 사용자',
  email: TEST_CREDENTIALS.email,
  role: 'USER',
}

const now = '2026-04-27T08:00:00Z'

const baseCategories = [
  { id: 'cat-1', folderId: 'cat-1', name: 'Frontend', parentId: null },
  { id: 'cat-2', folderId: 'cat-2', name: 'Backend', parentId: null },
  { id: 'cat-3', folderId: 'cat-3', name: 'Ideas', parentId: null },
]

const baseNotes = [
  {
    id: '101',
    noteId: '101',
    title: '대시보드 개선 아이디어',
    content: ['# 대시보드 개선', '- [ ] 카드 간격 다듬기', '- [x] 완료된 항목', '- [ ] TODO 액션 문구 검토'].join('\n'),
    visibility: 'PUBLIC',
    aiCollectable: true,
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-05T09:00:00Z',
    categoryId: 'cat-1',
    folderId: 'cat-1',
    tags: [{ id: 'tag-1', name: 'React' }, { id: 'tag-2', name: 'UX' }],
  },
  {
    id: '102',
    noteId: '102',
    title: 'API note 스펙 전환 메모',
    content: ['스펙 전환 메모', '- [ ] 응답 필드 호환 레이어 확인', '', 'RAG 검색 품질을 확인한다.'].join('\n'),
    visibility: 'AI_COLLECTABLE',
    aiCollectable: true,
    createdAt: '2026-04-02T10:00:00Z',
    updatedAt: '2026-04-04T09:00:00Z',
    categoryId: 'cat-2',
    folderId: 'cat-2',
    tags: [{ id: 'tag-2', name: 'UX' }, { id: 'tag-4', name: 'AI' }],
  },
  {
    id: '103',
    noteId: '103',
    title: '짧은 메모',
    content: '아직 정리되지 않은 아이디어.',
    visibility: 'PRIVATE',
    aiCollectable: false,
    createdAt: '2026-04-03T10:00:00Z',
    updatedAt: '2026-04-03T10:00:00Z',
    categoryId: 'cat-3',
    folderId: 'cat-3',
    tags: [],
  },
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function getRequestBody(request) {
  try {
    return request.postDataJSON()
  } catch {
    return {}
  }
}

function normalizeId(value) {
  if (value === undefined || value === null || value === '') return null
  return String(value)
}

function noteWithCategory(note, categories) {
  const folderId = normalizeId(note.folderId ?? note.categoryId)
  const category = categories.find((item) => String(item.id) === folderId) || null
  return {
    ...note,
    id: String(note.id ?? note.noteId),
    noteId: String(note.noteId ?? note.id),
    folderId,
    categoryId: folderId,
    category,
  }
}

function folderTree(categories, parentId = null) {
  return categories
    .filter((category) => normalizeId(category.parentId) === normalizeId(parentId))
    .map((category) => ({
      folderId: category.id,
      name: category.name,
      parentId: category.parentId,
      children: folderTree(categories, category.id),
    }))
}

function sortNotes(items, sort = 'createdAt', order = 'desc') {
  return [...items].sort((left, right) => {
    let leftValue = left[sort]
    let rightValue = right[sort]

    if (sort === 'createdAt' || sort === 'updatedAt') {
      leftValue = new Date(leftValue || left.createdAt).getTime()
      rightValue = new Date(rightValue || right.createdAt).getTime()
    } else {
      leftValue = String(leftValue || '').toLowerCase()
      rightValue = String(rightValue || '').toLowerCase()
    }

    const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
    return order === 'asc' ? comparison : -comparison
  })
}

function filteredNotes(requestUrl, state, { publicOnly = false } = {}) {
  const keyword = (requestUrl.searchParams.get('keyword') || requestUrl.searchParams.get('q') || '').toLowerCase()
  const categoryId = requestUrl.searchParams.get('categoryId')
  const visibility = requestUrl.searchParams.get('visibility')
  const aiCollectable = requestUrl.searchParams.get('aiCollectable')
  const sortParam = requestUrl.searchParams.get('sort') || 'createdAt,desc'
  const [sort = 'createdAt', order = 'desc'] = sortParam.split(',')

  let items = state.notes.map((note) => noteWithCategory(note, state.categories))

  if (publicOnly) {
    items = items.filter((note) => ['PUBLIC', 'AI_COLLECTABLE'].includes(note.visibility))
  }

  if (keyword) {
    items = items.filter((note) => {
      const haystack = `${note.title} ${note.content}`.toLowerCase()
      return haystack.includes(keyword)
    })
  }

  if (categoryId) {
    items = items.filter((note) => String(note.folderId) === String(categoryId))
  }

  if (visibility) {
    items = items.filter((note) => note.visibility === visibility)
  }

  if (aiCollectable !== null) {
    const flag = aiCollectable === 'true'
    items = items.filter((note) => Boolean(note.aiCollectable) === flag)
  }

  return sortNotes(items, sort, order)
}

function pagedNotes(requestUrl, state, options = {}) {
  const requestedPage = Number(requestUrl.searchParams.get('page') || '0')
  const page = options.oneBasedPage ? Math.max(0, requestedPage - 1) : requestedPage
  const size = Number(requestUrl.searchParams.get('size') || '10')
  const items = filteredNotes(requestUrl, state, options)
  const start = Math.max(0, page) * size
  const contents = items.slice(start, start + size)

  return {
    contents,
    page,
    size,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size) || 1,
    last: start + size >= items.length,
  }
}

function activityCalendar(requestUrl) {
  return {
    from: requestUrl.searchParams.get('from') || '2026-01-01',
    to: requestUrl.searchParams.get('to') || '2026-04-27',
    timezone: 'Asia/Seoul',
    calendar: [
      { date: '2026-04-25', count: 2 },
      { date: '2026-04-26', count: 1 },
      { date: '2026-04-27', count: 3 },
    ],
  }
}

function ok(route, data, status = 200) {
  return route.fulfill({ status, json: status === 204 ? undefined : { data } })
}

function fail(route, status, code, message) {
  return route.fulfill({
    status,
    json: {
      error: { code, message },
    },
  })
}

function nextId(items) {
  const max = items.reduce((value, item) => Math.max(value, Number(item.id || item.noteId || item.folderId) || 0), 200)
  return String(max + 1)
}

export async function mockKeepgoingApi(page, options = {}) {
  const state = {
    authenticated: options.authenticated ?? true,
    user: { ...mockUser },
    notes: clone(options.notes || baseNotes),
    categories: clone(options.categories || baseCategories),
    aiRequests: [],
    loginRequests: [],
  }

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const requestUrl = new URL(request.url())

    // Vite serves source modules from /src/api/*.js in dev mode; the broad
    // **/api/** pattern matches those files too. Only mock actual backend API
    // calls and let app source/module requests continue to Vite.
    if (!requestUrl.pathname.startsWith('/api/')) {
      await route.continue()
      return
    }

    const path = requestUrl.pathname.replace(/^\/api/, '') || '/'
    const method = request.method()

    if (path === '/auth/login' && method === 'POST') {
      const body = getRequestBody(request)
      state.loginRequests.push(body)
      if (body.email === TEST_CREDENTIALS.email && body.password === TEST_CREDENTIALS.password) {
        state.authenticated = true
        return ok(route, state.user)
      }
      return fail(route, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials')
    }

    if (path === '/auth/refresh' && method === 'POST') {
      return state.authenticated ? route.fulfill({ status: 204 }) : fail(route, 401, 'AUTH_REQUIRED', 'Authentication required')
    }

    if (path === '/users/me' && method === 'GET') {
      return state.authenticated ? ok(route, state.user) : fail(route, 401, 'AUTH_REQUIRED', 'Authentication required')
    }

    if (path === '/users/me' && method === 'PATCH') {
      if (!state.authenticated) return fail(route, 401, 'AUTH_REQUIRED', 'Authentication required')
      const body = getRequestBody(request)
      state.user = { ...state.user, name: body.name }
      return ok(route, state.user)
    }

    if (path === '/users/me/change-password' && method === 'POST') {
      if (!state.authenticated) return fail(route, 401, 'AUTH_REQUIRED', 'Authentication required')
      const body = getRequestBody(request)
      if (body.currentPassword !== TEST_CREDENTIALS.password) {
        return fail(route, 400, 'USER_CURRENT_PASSWORD_MISMATCH', 'Current password mismatch')
      }
      return ok(route, true)
    }

    if (path === '/folders/tree' && method === 'GET') {
      if (!state.authenticated) return fail(route, 401, 'AUTH_REQUIRED', 'Authentication required')
      return ok(route, folderTree(state.categories))
    }

    if (path === '/folders' && method === 'POST') {
      const body = getRequestBody(request)
      const id = `cat-${nextId(state.categories)}`
      const category = { id, folderId: id, name: body.name, parentId: normalizeId(body.parentId) }
      state.categories.push(category)
      return ok(route, { folderId: id, name: category.name, parentId: category.parentId })
    }

    const folderMatch = path.match(/^\/folders\/([^/]+)(?:\/(parent))?$/)
    if (folderMatch) {
      const id = decodeURIComponent(folderMatch[1])
      const category = state.categories.find((item) => String(item.id) === id)
      if (!category) return fail(route, 404, 'FOLDER_NOT_FOUND', 'Folder not found')

      if (method === 'PATCH' && folderMatch[2] === 'parent') {
        const body = getRequestBody(request)
        category.parentId = normalizeId(body.parentId)
        return ok(route, { folderId: category.id, name: category.name, parentId: category.parentId })
      }

      if (method === 'PATCH') {
        const body = getRequestBody(request)
        category.name = body.name
        return ok(route, { folderId: category.id, name: category.name, parentId: category.parentId })
      }

      if (method === 'DELETE') {
        state.categories = state.categories.filter((item) => String(item.id) !== id)
        state.notes = state.notes.map((note) => String(note.folderId ?? note.categoryId) === id
          ? { ...note, folderId: null, categoryId: null }
          : note)
        return route.fulfill({ status: 204 })
      }
    }

    if (path === '/activities/me/dashboard' && method === 'GET') {
      if (!state.authenticated) return fail(route, 401, 'AUTH_REQUIRED', 'Authentication required')
      return ok(route, activityCalendar(requestUrl))
    }

    if ((path === '/notes/me' || path === '/notes/me/search') && method === 'GET') {
      if (!state.authenticated) return fail(route, 401, 'AUTH_REQUIRED', 'Authentication required')
      return ok(route, pagedNotes(requestUrl, state))
    }

    if (path === '/notes' && method === 'POST') {
      if (!state.authenticated) return fail(route, 401, 'AUTH_REQUIRED', 'Authentication required')
      const body = getRequestBody(request)
      const id = nextId(state.notes)
      const note = {
        id,
        noteId: id,
        title: body.title,
        content: body.content,
        visibility: body.visibility || 'PUBLIC',
        aiCollectable: Boolean(body.aiCollectable),
        createdAt: now,
        updatedAt: now,
        categoryId: normalizeId(body.folderId),
        folderId: normalizeId(body.folderId),
        tags: [],
      }
      state.notes.unshift(note)
      return ok(route, noteWithCategory(note, state.categories))
    }

    const noteFolderMatch = path.match(/^\/notes\/([^/]+)\/folder$/)
    if (noteFolderMatch && method === 'PATCH') {
      const id = decodeURIComponent(noteFolderMatch[1])
      const note = state.notes.find((item) => String(item.id ?? item.noteId) === id)
      if (!note) return fail(route, 404, 'NOTE_NOT_FOUND', 'Note not found')
      const body = getRequestBody(request)
      note.folderId = normalizeId(body.folderId)
      note.categoryId = normalizeId(body.folderId)
      note.updatedAt = now
      return ok(route, noteWithCategory(note, state.categories))
    }

    const noteMatch = path.match(/^\/notes\/([^/]+)$/)
    if (noteMatch) {
      const id = decodeURIComponent(noteMatch[1])
      const note = state.notes.find((item) => String(item.id ?? item.noteId) === id)

      if (!note) return fail(route, 404, 'NOTE_NOT_FOUND', 'NOT_FOUND')

      if (method === 'GET') {
        return ok(route, noteWithCategory(note, state.categories))
      }

      if (method === 'PUT') {
        const body = getRequestBody(request)
        Object.assign(note, {
          title: body.title ?? note.title,
          content: body.content ?? note.content,
          visibility: body.visibility ?? note.visibility,
          aiCollectable: typeof body.aiCollectable === 'boolean' ? body.aiCollectable : note.aiCollectable,
          updatedAt: now,
        })
        return ok(route, noteWithCategory(note, state.categories))
      }

      if (method === 'DELETE') {
        state.notes = state.notes.filter((item) => String(item.id ?? item.noteId) !== id)
        return route.fulfill({ status: 204 })
      }
    }

    if (path === '/ai/panel/messages' && method === 'POST') {
      if (!state.authenticated) return fail(route, 401, 'AUTH_REQUIRED', 'Authentication required')
      const body = getRequestBody(request)
      state.aiRequests.push(body)
      return ok(route, {
        assistantMessage: `요청하신 “${body.message}”에 대한 테스트 응답입니다.`,
        contextAttached: Boolean(body.contextNoteId),
        contextNoteId: body.contextNoteId,
      })
    }

    const publicProfileMatch = path.match(/^\/users\/([^/]+)\/profile$/)
    if (publicProfileMatch && method === 'GET') {
      const username = decodeURIComponent(publicProfileMatch[1])
      return ok(route, {
        username,
        name: '공개 사용자',
        bio: '공개 노트를 공유하는 테스트 프로필',
        techStack: ['React', 'Spring Boot', 'RAG'],
        noteCount: filteredNotes(requestUrl, state, { publicOnly: true }).length,
        joinedAt: '2024-01-01T00:00:00Z',
      })
    }

    const publicNotesMatch = path.match(/^\/users\/([^/]+)\/notes(?:\/([^/]+))?$/)
    if (publicNotesMatch && method === 'GET') {
      const noteId = publicNotesMatch[2]
      if (noteId) {
        const note = filteredNotes(requestUrl, state, { publicOnly: true }).find((item) => String(item.id) === String(noteId))
        if (!note) return fail(route, 404, 'NOTE_NOT_FOUND', 'NOT_FOUND')
        const publicNotes = filteredNotes(requestUrl, state, { publicOnly: true })
        const index = publicNotes.findIndex((item) => String(item.id) === String(noteId))
        return ok(route, {
          ...note,
          prevNote: publicNotes[index + 1] ? { id: publicNotes[index + 1].id, title: publicNotes[index + 1].title } : null,
          nextNote: publicNotes[index - 1] ? { id: publicNotes[index - 1].id, title: publicNotes[index - 1].title } : null,
        })
      }
      return ok(route, pagedNotes(requestUrl, state, { publicOnly: true, oneBasedPage: true }))
    }

    return fail(route, 404, 'UNHANDLED_E2E_API', `${method} ${path} was not handled by the E2E mock API`)
  })

  return state
}

export async function loginWithTestUser(page) {
  await page.goto('/login')
  await page.getByLabel('이메일').fill(TEST_CREDENTIALS.email)
  await page.getByLabel('비밀번호').fill(TEST_CREDENTIALS.password)
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL(/\/notes(?:$|\?)/)
}
