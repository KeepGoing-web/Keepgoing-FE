import { expect, test } from '@playwright/test'

const mockUser = {
  userId: 'user-1',
  name: '테스트 사용자',
  email: 'test@example.com',
  role: 'USER',
}

const mockCategories = [
  { id: 'cat-1', name: 'Frontend', parentId: null },
  { id: 'cat-2', name: 'Backend', parentId: null },
  { id: 'cat-3', name: 'Ideas', parentId: null },
]

const mockTags = [
  { id: 'tag-1', name: 'React' },
  { id: 'tag-2', name: 'UX' },
  { id: 'tag-3', name: 'Infra' },
  { id: 'tag-4', name: 'AI' },
]

const mockNotes = [
  {
    noteId: '101',
    title: '대시보드 개선 아이디어',
    content: '현재 대시보드에서는 overview 카드와 최근 활동의 밀도를 조금 더 높일 수 있다.',
    visibility: 'PUBLIC',
    aiCollectable: true,
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-05T09:00:00Z',
    categoryId: 'cat-1',
    tags: [{ id: 'tag-1', name: 'React' }, { id: 'tag-2', name: 'UX' }],
  },
  {
    noteId: '102',
    title: 'API note 스펙 전환 메모',
    content: 'post 기반 응답을 note 기반 응답으로 치환하는 동안 호환 레이어가 필요하다.',
    visibility: 'AI_COLLECTABLE',
    aiCollectable: true,
    createdAt: '2026-04-02T10:00:00Z',
    updatedAt: '2026-04-04T09:00:00Z',
    categoryId: 'cat-2',
    tags: [{ id: 'tag-2', name: 'UX' }, { id: 'tag-4', name: 'AI' }],
  },
  {
    noteId: '103',
    title: '짧은 메모',
    content: '아직 정리되지 않은 아이디어.',
    visibility: 'PRIVATE',
    aiCollectable: false,
    createdAt: '2026-04-03T10:00:00Z',
    updatedAt: '2026-04-03T10:00:00Z',
    categoryId: 'cat-3',
    tags: [],
  },
]

function pagedNotes(request) {
  const url = new URL(request.url())
  const page = Number(url.searchParams.get('page') || '0')
  const size = Number(url.searchParams.get('size') || '10')
  const start = page * size
  const items = mockNotes.slice(start, start + size)

  return {
    data: {
      contents: items,
      page,
      size,
      totalElements: mockNotes.length,
      totalPages: Math.ceil(mockNotes.length / size),
      last: start + size >= mockNotes.length,
    },
  }
}

async function mockNoteApi(page) {
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { data: mockUser } }))
  await page.route('**/api/categories**', (route) => route.fulfill({ json: { categories: mockCategories } }))
  await page.route('**/api/tags**', (route) => route.fulfill({ json: { tags: mockTags } }))
  await page.route('**/api/notes/me/search**', (route) => route.fulfill({ json: pagedNotes(route.request()) }))
  await page.route('**/api/notes/me**', (route) => route.fulfill({ json: pagedNotes(route.request()) }))

  for (const note of mockNotes) {
    await page.route(`**/api/notes/${note.noteId}`, (route) => route.fulfill({ json: { data: note } }))
  }
}

test('dashboard and note area flows render and respond', async ({ page }) => {
  await mockNoteApi(page)

  await page.goto('/notes')
  await expect(page.getByRole('heading', { name: '노트 대시보드' })).toBeVisible()
  await expect(page.locator('.dash-overview-card').first()).toContainText('보관 중인 노트')
  await expect(page.locator('.dash-recent-title').filter({ hasText: '대시보드 개선 아이디어' })).toBeVisible()

  await page.goto('/notes/list')
  await expect(page.getByRole('heading', { name: '노트 보관함' })).toBeVisible()
  await expect(page.locator('.note-list-summary-count')).toHaveText('총 3개 노트')
  await expect(page.locator('.blog-card-title').filter({ hasText: 'API note 스펙 전환 메모' })).toBeVisible()

  await page.getByLabel('노트 검색').fill('대시보드')
  await page.waitForTimeout(400)
  await expect(page.locator('.note-list-filter-chip').filter({ hasText: '검색: 대시보드' })).toBeVisible()

  await page.locator('.blog-card').first().click()
  await expect(page.getByRole('heading', { name: '대시보드 개선 아이디어' })).toBeVisible()

  await page.goto('/notes/write')
  await expect(page.getByLabel('노트 제목')).toBeVisible()
  await expect(page.locator('.bw-header-title')).toHaveText('새 노트')
})

test('dashboard overview cards respect the light theme palette', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kg-theme', 'light')
  })
  await mockNoteApi(page)

  await page.goto('/notes')

  const computed = await page.locator('.dash-overview-card').first().evaluate((element) => {
    const styles = window.getComputedStyle(element)

    return {
      theme: document.documentElement.getAttribute('data-theme'),
      backgroundImage: styles.backgroundImage,
      color: styles.color,
    }
  })

  expect(computed.theme).toBe('light')
  expect(computed.backgroundImage).not.toContain('17, 17, 27')
  expect(computed.backgroundImage).not.toContain('30, 30, 46')

  const sidebarCard = await page.locator('.sidebar-workspace-card').evaluate((element) => {
    const styles = window.getComputedStyle(element)
    return styles.backgroundImage
  })
  expect(sidebarCard).not.toContain('17, 17, 27')
  expect(sidebarCard).not.toContain('30, 30, 46')

  await page.goto('/notes/list')
  const summaryCard = await page.locator('.note-list-summary-main').evaluate((element) => {
    const styles = window.getComputedStyle(element)
    return styles.backgroundImage
  })
  expect(summaryCard).not.toContain('17, 17, 27')
  expect(summaryCard).not.toContain('30, 30, 46')
})
