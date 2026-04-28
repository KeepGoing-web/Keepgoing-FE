import { expect, test } from '@playwright/test'
import { TEST_CREDENTIALS } from './support/mockKeepgoingApi.js'

test.skip(process.env.E2E_LIVE !== '1', 'Set E2E_LIVE=1 to run live backend smoke tests.')

test.describe.configure({ mode: 'serial' })

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('이메일').fill(TEST_CREDENTIALS.email)
  await page.getByLabel('비밀번호').fill(TEST_CREDENTIALS.password)
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page).toHaveURL(/\/notes(?:$|\?)/, { timeout: 15000 })
}

test('live backend login and authenticated navigation smoke', async ({ page }) => {
  await login(page)
  await expect(page.getByRole('link', { name: '노트', exact: true })).toBeVisible()

  await page.goto('/notes/list')
  await expect(page.getByRole('heading', { name: '노트 보관함' })).toBeVisible({ timeout: 15000 })

  await page.goto('/query')
  await expect(page.getByRole('heading', { name: '질문 범위' })).toBeVisible({ timeout: 15000 })

  await page.goto('/settings/account')
  await expect(page.getByRole('heading', { name: '계정 설정' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(TEST_CREDENTIALS.email)).toBeVisible()
})

test('live backend can create then delete an isolated E2E note', async ({ page }) => {
  await login(page)
  const title = `E2E-${Date.now()}`

  await page.goto('/notes/write')
  await page.getByLabel('노트 제목').fill(title)
  await page.locator('.tiptap-prosemirror').fill(`# ${title}\n\n라이브 백엔드 스모크 테스트 후 삭제됩니다.`)
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15000 })

  await page.getByRole('button', { name: '추가 작업' }).click()
  await page.getByRole('menuitem', { name: '삭제' }).click()
  await page.getByRole('button', { name: '삭제' }).click()
  await expect(page).toHaveURL(/\/notes$/)
})
