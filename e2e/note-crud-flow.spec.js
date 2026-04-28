import { expect, test } from '@playwright/test'
import { mockKeepgoingApi } from './support/mockKeepgoingApi.js'

test.beforeEach(async ({ page }) => {
  await mockKeepgoingApi(page)
})

test('library search and quick filters narrow notes predictably', async ({ page }) => {
  await page.goto('/notes/list')
  await expect(page.getByRole('heading', { name: '노트 보관함' })).toBeVisible()
  await expect(page.locator('.note-list-summary-meta')).toContainText('총 3개 문서')

  await page.getByRole('button', { name: 'AI 활용 가능' }).click()
  await expect(page.locator('.note-list-summary-meta')).toContainText('총 2개 문서')
  await expect(page.getByText('AI 수집 허용').first()).toBeVisible()

  await page.getByRole('button', { name: '비공개' }).click()
  await expect(page.locator('.note-list-summary-meta')).toContainText('총 1개 문서')
  await expect(page.getByRole('heading', { name: '짧은 메모' })).toBeVisible()

  await page.getByRole('button', { name: '전체', exact: true }).click()
  await page.getByLabel('노트 검색').fill('스펙')
  await expect(page.getByRole('heading', { name: 'API note 스펙 전환 메모' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '짧은 메모' })).toHaveCount(0)

  await page.getByRole('button', { name: '고급 필터' }).click()
  await page.getByLabel('정렬').selectOption('title:asc')
  await expect(page.getByLabel('정렬')).toHaveValue('title:asc')

  await page.getByRole('button', { name: '전체 초기화' }).first().click()
  await expect(page.locator('.note-list-summary-meta')).toContainText('총 3개 문서')
})

test('note create, preview, edit, AI panel, and delete flow works', async ({ page }) => {
  await page.goto('/notes/write')
  await expect(page.locator('.bw-header-title')).toHaveText('새 노트')

  await page.getByLabel('노트 제목').fill('E2E 작성 노트')
  await page.locator('.tiptap-prosemirror').fill('# E2E 작성 노트\n\n- [ ] 브라우저 테스트로 저장 확인\n\n본문입니다.')
  await page.getByRole('button', { name: 'AI 수집' }).click()
  await page.getByRole('button', { name: '미리보기' }).click()
  await expect(page.getByRole('heading', { name: 'E2E 작성 노트' })).toBeVisible()
  await expect(page.getByText('AI 수집 허용')).toBeVisible()

  await page.getByRole('button', { name: '저장' }).click()
  await expect(page).toHaveURL(/\/notes\/\d+$/)
  await expect(page.getByRole('heading', { name: 'E2E 작성 노트' })).toBeVisible()
  await expect(page.getByText('노트가 저장되었습니다.')).toBeVisible()

  await page.getByRole('link', { name: '수정' }).click()
  await expect(page).toHaveURL(/\/notes\/edit\/\d+$/)
  await page.getByLabel('노트 제목').fill('E2E 수정 노트')
  await page.locator('.tiptap-prosemirror').fill('# E2E 수정 노트\n\n수정된 본문입니다.')
  await page.getByRole('button', { name: '수정' }).click()
  await expect(page).toHaveURL(/\/notes\/\d+$/)
  await expect(page.getByRole('heading', { name: 'E2E 수정 노트' })).toBeVisible()
  await expect(page.getByText('노트가 수정되었습니다.')).toBeVisible()

  await page.getByRole('button', { name: 'AI 패널 열기' }).click()
  await expect(page.getByText('현재 노트 문맥 연결됨')).toBeVisible()
  await page.locator('.ai-input').fill('핵심을 한 줄로 요약해줘')
  await page.locator('.ai-input').press('Enter')
  await expect(page.getByText('테스트 응답입니다')).toBeVisible()
  await expect(page.getByText('노트 문맥 포함 응답')).toBeVisible()

  await page.getByRole('button', { name: '추가 작업' }).click()
  await page.getByRole('menuitem', { name: '삭제' }).click()
  await expect(page.getByRole('dialog')).toContainText('이 노트를 삭제하시겠습니까?')
  await page.getByRole('button', { name: '삭제' }).click()
  await expect(page).toHaveURL(/\/notes$/)
  await expect(page.getByText('노트가 삭제되었습니다.')).toBeVisible()
})
