import { chromium, type APIRequestContext } from '@playwright/test'

const API_URL = 'http://localhost:4000'
const APP_URL = 'http://localhost:3000'

/**
 * Call Better Auth API directly — faster and more reliable than UI automation.
 * Returns the Set-Cookie headers on success, null on failure.
 */
const authViaApi = async (params: {
  request: APIRequestContext
  endpoint: string
  body: Record<string, string>
}): Promise<string[] | null> => {
  const response = await params.request.post(`${API_URL}${params.endpoint}`, {
    data: params.body,
    headers: {
      'Content-Type': 'application/json',
      Origin: APP_URL,
      Referer: APP_URL,
    },
  })
  if (!response.ok()) {
    const body = await response.text().catch(() => '')
    console.warn(`Auth ${params.endpoint} failed (${response.status()}): ${body}`)
    return null
  }
  const cookies = response
    .headersArray()
    .filter((h) => h.name.toLowerCase() === 'set-cookie')
    .map((h) => h.value)
  return cookies.length > 0 ? cookies : null
}

/** Global setup: register or login the test user and save auth state. */
const globalSetup = async () => {
  const email = process.env['E2E_TEST_EMAIL'] ?? 'test-e2e@example.com'
  const password = process.env['E2E_TEST_PASSWORD'] ?? 'TestPassword123!'

  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: APP_URL })
  const page = await context.newPage()

  // Try register first; fall back to login if account exists
  let cookies = await authViaApi({
    request: context.request,
    endpoint: '/api/auth/sign-up/email',
    body: { email, password, name: 'Test User' },
  })

  if (!cookies) {
    cookies = await authViaApi({
      request: context.request,
      endpoint: '/api/auth/sign-in/email',
      body: { email, password },
    })
  }

  if (!cookies) {
    await browser.close()
    throw new Error(`E2E setup failed: could not authenticate with ${email}`)
  }

  // Register get-session listener BEFORE navigation to catch the early response
  const sessionReady = page
    .waitForResponse((resp) => resp.url().includes('/api/auth/get-session'), { timeout: 25000 })
    .catch(() => null)

  await page.goto(`${APP_URL}/projects`)
  await sessionReady

  // Save full browser storage state (cookies + localStorage)
  await context.storageState({ path: 'e2e/.auth/user.json' })
  await browser.close()
}

export default globalSetup
