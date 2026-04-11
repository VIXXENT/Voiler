import { chromium, type APIRequestContext } from '@playwright/test'

const API_URL = 'http://localhost:4000'
const APP_URL = 'http://localhost:3000'

/** Call Better Auth API directly. Returns cookies on success, null on failure. */
const authViaApi = async (params: {
  request: APIRequestContext
  endpoint: string
  body: Record<string, string>
}): Promise<string[] | null> => {
  const response = await params.request.post(`${API_URL}${params.endpoint}`, {
    data: params.body,
    headers: { 'Content-Type': 'application/json', Origin: APP_URL, Referer: APP_URL },
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

/** Delete all test user projects via tRPC to avoid free plan limit (max 3). */
const cleanupProjects = async ({ request }: { request: APIRequestContext }) => {
  const listResp = await request
    .get(`${API_URL}/trpc/project.list`, { headers: { Origin: APP_URL } })
    .catch(() => null)
  if (!listResp?.ok()) {
    return
  }

  // eslint-disable-next-line @typescript-eslint/typedef
  const body = await listResp.json().catch(() => null)
  // eslint-disable-next-line @typescript-eslint/typedef
  const projects = body?.result?.data ?? []
  console.log(`[global-setup] Cleaning up ${projects.length} existing projects...`)

  for (const project of projects) {
    // eslint-disable-next-line @typescript-eslint/typedef
    const id: string =
      typeof project === 'object' && project !== null
        ? ((project as Record<string, unknown>)['id'] as string)
        : ''
    if (!id) {
      continue
    }
    await request
      .post(`${API_URL}/trpc/project.delete`, {
        data: { projectId: id },
        headers: { 'Content-Type': 'application/json', Origin: APP_URL },
      })
      .catch(() => null)
  }
}

/** Global setup: authenticate the test user, clean up test data, save auth state. */
const globalSetup = async () => {
  const email = process.env['E2E_TEST_EMAIL'] ?? 'test-e2e@example.com'
  const password = process.env['E2E_TEST_PASSWORD'] ?? 'TestPassword123!'

  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: APP_URL })
  const page = await context.newPage()

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

  // Clean up leftover projects from previous test runs to stay under free plan limit
  await cleanupProjects({ request: context.request })

  // Navigate and wait for session to confirm auth state is in browser context
  const sessionReady = page
    .waitForResponse((resp) => resp.url().includes('/api/auth/get-session'), { timeout: 25000 })
    .catch(() => null)
  await page.goto(`${APP_URL}/projects`)
  await sessionReady

  await context.storageState({ path: 'e2e/.auth/user.json' })
  await browser.close()
}

export default globalSetup
