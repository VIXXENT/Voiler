import { chromium } from '@playwright/test'

/** Global setup: register a test user and save auth state. */
const globalSetup = async () => {
  const email = process.env['E2E_TEST_EMAIL'] ?? 'test@taskforge.e2e'
  const password = process.env['E2E_TEST_PASSWORD'] ?? 'TestPassword123!'

  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Attempt registration first; if account already exists, fall back to login
  await page.goto('http://localhost:3000/auth/register')
  await page.getByRole('textbox', { name: /name/i }).fill('Test User')
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /register|sign\s*up/i }).click()

  // Wait for any post-auth redirect (dashboard, projects, or home)
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15000 }).catch(async () => {
    // Registration may have failed (account exists) — fall back to login
    await page.goto('http://localhost:3000/auth/login')
    await page.getByRole('textbox', { name: /email/i }).fill(email)
    await page.getByLabel(/password/i).fill(password)
    await page.getByRole('button', { name: /log\s*in|sign\s*in/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15000 })
  })

  // Ensure we land on /projects regardless of where the app redirected
  if (!page.url().includes('/projects')) {
    await page.goto('http://localhost:3000/projects')
    await page.waitForURL('**/projects', { timeout: 10000 })
  }

  // Save auth state for reuse across all test files
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
  await browser.close()
}

export default globalSetup
