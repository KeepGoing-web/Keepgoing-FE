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
  await page.route('**/api/users/me', (route) => route.fulfill({ json: { data: mockUser } }))
  await page.route('**/api/folders/tree', (route) => route.fulfill({
    json: {
      data: mockCategories.map((category) => ({
        folderId: category.id,
        name: category.name,
        parentId: category.parentId,
        children: [],
      })),
    },
  }))
  await page.route('**/api/notes/me/search**', (route) => route.fulfill({ json: pagedNotes(route.request()) }))
  await page.route('**/api/notes/me**', (route) => route.fulfill({ json: pagedNotes(route.request()) }))

  for (const note of mockNotes) {
    await page.route(`**/api/notes/${note.noteId}`, (route) => route.fulfill({ json: { data: note } }))
  }
}

test('dashboard home is simplified and document-first', async ({ page }) => {
  await mockNoteApi(page)

  await page.goto('/notes')
  await expect(page.locator('.dash-title')).toContainText('최근 노트')
  await expect(page.locator('.dash-search-input')).toBeVisible()
  await expect(page.locator('.dash-document-row')).toHaveCount(3)
  await expect(page.locator('.ai-toggle-btn')).toHaveCount(0)
  await expect(page.getByText('최근 열어본 문서')).toHaveCount(0)
  await expect(page.getByText('문서가 많은 폴더')).toHaveCount(0)

  await page.locator('.dash-search-input').fill('최근 메모를 바탕으로 핵심 개념을 정리해줘')
  await page.locator('.dash-search-submit').click()
  await expect(page).toHaveURL(/\/notes$/)
  await expect(page.locator('.ai-message').last()).toContainText('가장 가까운 문서는')

  await page.goto('/notes/list')
  await expect(page.locator('.note-shell-title')).toContainText('노트')
  await expect(page.locator('.note-list-summary-meta')).toContainText('총 3개 문서')
})

test('dashboard home and library respect the light theme palette', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kg-theme', 'light')
  })
  await mockNoteApi(page)

  await page.goto('/notes')

  const searchInput = await page.locator('.dash-search-input').evaluate((element) => {
    const styles = window.getComputedStyle(element)
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
    }
  })

  expect(searchInput.theme).toBe('light')
  expect(searchInput.backgroundColor).not.toContain('17, 17, 27')
  expect(searchInput.backgroundColor).not.toContain('30, 30, 46')
  expect(searchInput.borderColor).not.toContain('17, 17, 27')

  await page.goto('/notes/list')
  const searchBar = await page.locator('.search-bar').evaluate((element) => {
    const styles = window.getComputedStyle(element)
    return {
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
    }
  })
  expect(searchBar.backgroundColor).not.toContain('17, 17, 27')
  expect(searchBar.backgroundColor).not.toContain('30, 30, 46')
  expect(searchBar.borderColor).not.toContain('17, 17, 27')
})
