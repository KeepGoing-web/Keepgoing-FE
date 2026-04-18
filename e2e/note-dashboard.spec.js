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
    content: ['# 대시보드 개선', '- [ ] 카드 간격 다듬기', '- [ ] TODO 액션 문구 검토'].join('\n'),
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
    content: ['스펙 전환 메모', '- [ ] 응답 필드 호환 레이어 확인'].join('\n'),
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

test('dashboard home follows activity → todo → recent notes flow', async ({ page }) => {
  await mockNoteApi(page)

  await page.goto('/notes')
  await expect(page.getByRole('heading', { name: '활동 캘린더' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'TODO' })).toBeVisible()
  await expect(page.getByText('ACTIVITY')).toBeVisible()
  await expect(page.getByText('최근 4개월')).toBeVisible()
  await expect(page.getByText('1월')).toBeVisible()
  await expect(page.locator('.dash-todo-group')).toHaveCount(2)
  const todoSection = page.locator('.dash-section-shell--todo')
  await expect(todoSection.getByRole('button', { name: /카드 간격 다듬기/i })).toBeVisible()

  await todoSection.getByRole('button', { name: /카드 간격 다듬기/i }).click()
  await expect(page).toHaveURL(/\/notes\/101$/)
  await expect(page.getByRole('heading', { name: '대시보드 개선 아이디어' })).toBeVisible()

  await page.goto('/notes/list')
  await expect(page.getByRole('heading', { name: '노트 보관함' })).toBeVisible()
  await expect(page.locator('.note-list-summary-meta')).toContainText('총 3개 문서')
})

test('dashboard home and library respect the light theme palette', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('kg-theme', 'light')
  })
  await mockNoteApi(page)

  await page.goto('/notes')

  const dashboardShell = await page.locator('.dash-section-shell--activity').evaluate((element) => {
    const styles = window.getComputedStyle(element)
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
    }
  })

  expect(dashboardShell.theme).toBe('light')
  expect(dashboardShell.backgroundColor).not.toContain('17, 17, 27')
  expect(dashboardShell.backgroundColor).not.toContain('30, 30, 46')
  expect(dashboardShell.borderColor).not.toContain('17, 17, 27')
})
