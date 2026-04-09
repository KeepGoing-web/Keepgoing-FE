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

test('dashboard and note area flows render and respond', async ({ page }) => {
  await mockNoteApi(page)

  await page.goto('/notes')
  const embeddedAssistant = page.locator('.ai-chat-panel--embedded')
  await expect(embeddedAssistant.getByText('내 지식에 무엇이든 물어보세요')).toBeVisible()
  await expect(embeddedAssistant.locator('.ai-suggestion')).toHaveCount(3)

  await embeddedAssistant.getByPlaceholder('질문을 입력하세요...').fill('최근 메모를 바탕으로 핵심 개념을 정리해줘')
  await embeddedAssistant.getByRole('button', { name: '전송' }).click()
  await expect(embeddedAssistant.locator('.ai-message--user')).toContainText('최근 메모를 바탕으로 핵심 개념을 정리해줘')
  await expect(embeddedAssistant.locator('.ai-message--assistant')).toContainText('가장 가까운 문서는')

  await page.goto('/notes')
  await embeddedAssistant.locator('.ai-suggestion').first().click()
  await expect(embeddedAssistant.getByPlaceholder('질문을 입력하세요...')).toHaveValue('현재 문서의 핵심 개념 3개를 정리해줘')

  await page.goto('/notes/list')
  await expect(page.locator('.note-shell-title')).toBeVisible()
  await expect(page.locator('.note-shell-title')).toContainText('노트')
  await expect(page.locator('.note-list-summary-meta')).toContainText('총 3개 문서')
  await expect(page.locator('.blog-card-title').filter({ hasText: 'API note 스펙 전환 메모' })).toBeVisible()
  await expect(page.locator('.quick-filter-btn')).toHaveCount(4)

  await page.getByLabel('노트 검색').fill('대시보드')
  await page.waitForTimeout(400)
  await expect(page.locator('.note-list-filter-chip').filter({ hasText: '검색: 대시보드' })).toBeVisible()

  await page.locator('.quick-filter-btn').filter({ hasText: 'AI' }).first().click()
  await expect(page.locator('.note-list-filter-chip').filter({ hasText: 'AI 수집 허용' })).toBeVisible()

  const firstResult = page.locator('.blog-card').first()
  await expect(firstResult).toBeVisible()
  await firstResult.click()
  await expect(page).toHaveURL(/\/notes\/\d+$/)
  await expect(page.locator('.blog-header h1')).toHaveText(/대시보드 개선 아이디어|API note 스펙 전환 메모|짧은 메모/)

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

  const computed = await page.locator('.ai-chat-panel--embedded').evaluate((element) => {
    const styles = window.getComputedStyle(element)

    return {
      theme: document.documentElement.getAttribute('data-theme'),
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      color: styles.color,
    }
  })

  expect(computed.theme).toBe('light')
  expect(computed.backgroundColor).not.toContain('17, 17, 27')
  expect(computed.backgroundColor).not.toContain('30, 30, 46')
  expect(computed.borderColor).not.toContain('17, 17, 27')

  const sidebarCard = await page.locator('.sidebar').evaluate((element) => {
    const styles = window.getComputedStyle(element)
    return styles.backgroundImage
  })
  expect(sidebarCard).not.toContain('17, 17, 27')
  expect(sidebarCard).not.toContain('30, 30, 46')

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
