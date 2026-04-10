import { chromium } from '@playwright/test'

/** Global setup: register a test user and save auth state. */
const globalSetup = async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Attempt registration first; if account already exists, fall back to login
  await page.goto('http://localhost:3000/auth/register')
  await page.getByRole('textbox', { name: /name/i }).fill('Test User')
  await page.getByRole('textbox', { name: /email/i }).fill('test@taskforge.e2e')
  await page.getByLabel(/password/i).fill('TestPassword123!')
  await page.getByRole('button', { name: /register|sign\s*up/i }).click()

  // Check if registration failed (account already exists) and fall back to login
  const url = page.url()
  if (!url.includes('/projects')) {
    await page.goto('http://localhost:3000/auth/login')
    await page.getByRole('textbox', { name: /email/i }).fill('test@taskforge.e2e')
    await page.getByLabel(/password/i).fill('TestPassword123!')
    await page.getByRole('button', { name: /log\s*in|sign\s*in/i }).click()
  }

  // Wait for redirect to /projects (means auth succeeded)
  await page.waitForURL('**/projects', { timeout: 10000 })

  // Save auth state for reuse across all test files
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
  await browser.close()
}

export default globalSetup
