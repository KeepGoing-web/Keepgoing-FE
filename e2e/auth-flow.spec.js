import { expect, test } from '@playwright/test'
import { loginWithTestUser, mockKeepgoingApi, TEST_CREDENTIALS } from './support/mockKeepgoingApi.js'

test('protected routes redirect anonymous users and login validates fields', async ({ page }) => {
  await mockKeepgoingApi(page, { authenticated: false })

  await page.goto('/notes')
  await expect(page).toHaveURL(/\/login$/)

  await page.goto('/tester')
  await expect(page).toHaveURL(/\/login$/)

  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page.getByText('이메일을 입력해주세요.')).toBeVisible()
  await expect(page.getByText('비밀번호를 입력해주세요.')).toBeVisible()

  await page.getByLabel('이메일').fill('not-an-email')
  await page.getByLabel('비밀번호').fill(TEST_CREDENTIALS.password)
  await page.getByRole('button', { name: '로그인' }).click()
  await expect(page.getByText('올바른 이메일 주소를 입력해주세요.')).toBeVisible()
})

test('user can login, reach notes, toggle theme, and logout', async ({ page }) => {
  await mockKeepgoingApi(page, { authenticated: false })

  await loginWithTestUser(page)
  await expect(page.getByRole('link', { name: '노트', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '활동 캘린더' })).toBeVisible()

  await page.getByRole('button', { name: /라이트 모드로 전환|다크 모드로 전환/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/)

  await page.getByRole('button', { name: '로그아웃' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
