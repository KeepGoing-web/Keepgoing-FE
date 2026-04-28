import { expect, test } from '@playwright/test'
import { mockKeepgoingApi, TEST_CREDENTIALS } from './support/mockKeepgoingApi.js'

test.beforeEach(async ({ page }) => {
  await mockKeepgoingApi(page)
})

test('command palette and RAG workspace answer with grounded sources', async ({ page }) => {
  await page.goto('/notes')

  await page.getByRole('button', { name: '검색 팔레트 열기' }).click()
  await page.getByRole('textbox', { name: '검색' }).fill('스펙')
  await expect(page.getByRole('option', { name: /API note 스펙 전환 메모/ })).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/notes\/102$/)
  await expect(page.getByRole('heading', { name: 'API note 스펙 전환 메모' })).toBeVisible()

  await page.goto('/query')
  await expect(page.getByRole('heading', { name: '질문 범위' })).toBeVisible()
  await page.getByPlaceholder('노트와 블로그를 바탕으로 질문하세요').fill('RAG 검색 품질')
  await page.getByRole('button', { name: '질문' }).click()

  await expect(page.getByText('RAG 검색 품질')).toBeVisible()
  await expect(page.getByText(/가장 가까운 문서|근거가 부족/)).toBeVisible()
  await expect(page.getByText('추천 질문')).toBeVisible()
})

test('account settings validate and save profile/password changes', async ({ page }) => {
  await page.goto('/settings/account')
  await expect(page.getByRole('heading', { name: '계정 설정' })).toBeVisible()
  await expect(page.getByText(TEST_CREDENTIALS.email)).toBeVisible()

  await page.getByPlaceholder('이름을 입력하세요').fill('E2E 사용자')
  await page.getByRole('button', { name: '프로필 저장' }).click()
  await expect(page.getByText('프로필을 저장했습니다.')).toBeVisible()

  await page.getByPlaceholder('현재 비밀번호').fill('wrong-password')
  await page.getByRole('textbox', { name: '새 비밀번호', exact: true }).fill('short')
  await page.getByPlaceholder('새 비밀번호 확인').fill('short')
  await page.getByRole('button', { name: '비밀번호 변경' }).click()
  await expect(page.getByText('새 비밀번호는 8~64자이며 영문 대/소문자, 숫자, 특수문자(!@#$%^&*)를 포함해야 합니다.')).toBeVisible()

  await page.getByPlaceholder('현재 비밀번호').fill(TEST_CREDENTIALS.password)
  await page.getByRole('textbox', { name: '새 비밀번호', exact: true }).fill('Qwer1234!')
  await page.getByPlaceholder('새 비밀번호 확인').fill('Qwer1234!')
  await page.getByRole('button', { name: '비밀번호 변경' }).click()
  await expect(page.getByText('비밀번호를 변경했습니다.')).toBeVisible()
})

test('public profile and public note routes render shared content', async ({ page }) => {
  await page.goto('/@tester')
  await expect(page.getByRole('heading', { name: '공개 사용자' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '노트' })).toBeVisible()
  await expect(page.getByRole('link', { name: '대시보드 개선 아이디어' })).toBeVisible()

  await page.getByRole('link', { name: '대시보드 개선 아이디어' }).click()
  await expect(page).toHaveURL(/\/@tester\/101$/)
  await expect(page.getByRole('heading', { name: '대시보드 개선 아이디어' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '대시보드 개선', exact: true })).toBeVisible()

  await page.goto('/users/tester')
  await expect(page.getByRole('heading', { name: '공개 사용자' })).toBeVisible()
})
