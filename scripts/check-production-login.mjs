#!/usr/bin/env node

const DEFAULT_PRODUCTION_URL = 'https://keepgoingapp.vercel.app'
const REQUEST_TIMEOUT_MS = Number(process.env.PROD_LOGIN_CHECK_TIMEOUT_MS || 15000)
const RUN_BROWSER_CHECK = process.env.PROD_LOGIN_CHECK_BROWSER !== '0'

function normalizeBaseUrl(value) {
  const raw = String(value || DEFAULT_PRODUCTION_URL).trim()
  if (!raw) return DEFAULT_PRODUCTION_URL
  return raw.replace(/\/+$/, '')
}

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort(new Error(`Timed out after ${timeoutMs}ms`))
  }, timeoutMs)

  return { signal: controller.signal, cancel: () => clearTimeout(timeout) }
}

function preview(text, limit = 500) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

const baseUrl = normalizeBaseUrl(process.env.PROD_BASE_URL || process.env.PLAYWRIGHT_BASE_URL)
const loginUrl = new URL('/login', `${baseUrl}/`).toString()
const { signal, cancel } = createTimeoutSignal(REQUEST_TIMEOUT_MS)

let response
let body = ''

try {
  response = await fetch(loginUrl, {
    redirect: 'manual',
    signal,
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'keepgoing-prod-login-check/1.0',
    },
  })
  body = await response.text().catch(() => '')
} catch (error) {
  console.error(`[prod-login-check] FAIL ${loginUrl}`)
  console.error(`- request failed: ${error?.message || error}`)
  process.exit(1)
} finally {
  cancel()
}

const status = response.status
const location = response.headers.get('location') || ''
const contentType = response.headers.get('content-type') || ''
const vercelError = response.headers.get('x-vercel-error') || ''
const findings = []

if (status === 401) {
  findings.push('deployment is protected by Vercel Authentication/SSO or password protection')
}

if (status === 404 && (vercelError === 'DEPLOYMENT_NOT_FOUND' || body.includes('DEPLOYMENT_NOT_FOUND'))) {
  findings.push('configured production URL points to a deleted/missing Vercel deployment')
}

if (status >= 300 && status < 400 && /vercel\.com\/login|\/sso-api/i.test(location)) {
  findings.push(`deployment redirects to Vercel login instead of the app (${location})`)
}

if (!response.ok && !(status >= 300 && status < 400)) {
  findings.push(`unexpected HTTP ${status}`)
}

if (response.ok && !contentType.includes('text/html')) {
  findings.push(`expected an HTML SPA shell, got content-type: ${contentType || '(empty)'}`)
}

if (/404:\s*NOT_FOUND|DEPLOYMENT_NOT_FOUND|Log in to Vercel|Vercel Authentication/i.test(body)) {
  findings.push('response body is an infrastructure/access page, not the Keepgoing app')
}

if (response.ok && !body.includes('id="root"')) {
  findings.push('response does not look like the Vite app shell (#root not found)')
}

if (findings.length > 0) {
  console.error(`[prod-login-check] FAIL ${loginUrl}`)
  console.error(`- status: ${status}`)
  if (vercelError) console.error(`- x-vercel-error: ${vercelError}`)
  if (location) console.error(`- location: ${location}`)
  findings.forEach((finding) => console.error(`- ${finding}`))
  if (body) console.error(`- body preview: ${preview(body)}`)
  process.exit(1)
}

if (RUN_BROWSER_CHECK) {
  const browserFindings = []
  const browserEvents = []
  let browser

  try {
    const { chromium } = await import('@playwright/test')
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    page.on('pageerror', (error) => {
      browserEvents.push(`[pageerror] ${error?.message || error}`)
    })

    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        browserEvents.push(`[console:${message.type()}] ${message.text()}`)
      }
    })

    page.on('requestfailed', (request) => {
      browserEvents.push(`[requestfailed] ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`)
    })

    await page.goto(loginUrl, { waitUntil: 'load', timeout: REQUEST_TIMEOUT_MS })
    await page.waitForTimeout(3000)

    const hasEmailField = await page.getByLabel('이메일').isVisible().catch(() => false)
    const hasPasswordField = await page.getByLabel('비밀번호').isVisible().catch(() => false)
    const hasLoginButton = await page.getByRole('button', { name: '로그인' }).isVisible().catch(() => false)
    const hasGoogleButton = await page.getByRole('button', { name: 'Google로 계속하기' }).isVisible().catch(() => false)
    const bodyText = await page.locator('body').innerText().catch(() => '')

    if (!hasEmailField || !hasPasswordField || !hasLoginButton || !hasGoogleButton) {
      browserFindings.push('login form did not render in the browser')
    }

    if (!bodyText.trim()) {
      browserFindings.push('browser body text is empty after loading the app')
    }
  } catch (error) {
    browserFindings.push(`browser check failed: ${error?.message || error}`)
  } finally {
    await browser?.close().catch(() => {})
  }

  if (browserFindings.length > 0) {
    console.error(`[prod-login-check] FAIL ${loginUrl}`)
    browserFindings.forEach((finding) => console.error(`- ${finding}`))
    browserEvents.slice(-10).forEach((event) => console.error(`- ${event}`))
    process.exit(1)
  }
}

console.log(`[prod-login-check] OK ${loginUrl}`)
console.log(`- status: ${status}`)
console.log(`- content-type: ${contentType || '(empty)'}`)
console.log(`- browser-check: ${RUN_BROWSER_CHECK ? 'passed' : 'skipped'}`)
