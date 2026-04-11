import { chromium } from '@playwright/test'

/** Attempt to authenticate and return true on success, false on failure. */
const tryAuth = async (params: {
  page: import('@playwright/test').Page
  url: string
  buttonText: RegExp
  email: string
  password: string
  name?: string
}): Promise<boolean> => {
  const { page, url, buttonText, email, password, name } = params
  await page.goto(url)
  await page.waitForLoadState('domcontentloaded')

  if (name) {
    const nameInput = page.getByRole('textbox', { name: /^name/i })
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill(name)
    }
  }
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: buttonText }).click()

  // Wait for network to settle and check if we left the auth page
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined)
  return !page.url().includes('/auth/')
}

/** Global setup: register or login a test user and save auth state. */
const globalSetup = async () => {
  const email = process.env['E2E_TEST_EMAIL'] ?? 'test@taskforge.e2e'
  const password = process.env['E2E_TEST_PASSWORD'] ?? 'TestPassword123!'

  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Try registration first
  const registered = await tryAuth({
    page,
    url: 'http://localhost:3000/auth/register',
    buttonText: /sign\s*up/i,
    email,
    password,
    name: 'Test User',
  })

  // If registration didn't redirect away from auth, try login (account already exists)
  if (!registered) {
    const loggedIn = await tryAuth({
      page,
      url: 'http://localhost:3000/auth/login',
      buttonText: /sign\s*in/i,
      email,
      password,
    })
    if (!loggedIn) {
      await browser.close()
      throw new Error(`E2E setup failed: could not register or login with ${email}`)
    }
  }

  // Navigate explicitly to /projects to ensure we're on the right page
  await page.goto('http://localhost:3000/projects')
  await page.waitForLoadState('networkidle', { timeout: 10000 })

  // Save auth state for reuse across all test files
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
  await browser.close()
}

export default globalSetup
