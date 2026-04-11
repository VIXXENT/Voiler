import { expect, test } from '@playwright/test'

test.describe('Navigation', () => {
  test('authenticated user can access /projects directly', async ({ page }) => {
    await page.goto('/projects')
    // Sign out button only renders after React hydration + auth session resolved
    await page.getByRole('button', { name: /sign out/i }).waitFor({ state: 'visible' })
    await expect(page).toHaveURL(/\/projects/)
  })

  test('sidebar shows Projects, Billing, Settings links', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /sign out/i }).waitFor({ state: 'visible' })
    const sidebar = page.locator('aside')
    await expect(sidebar.getByRole('link', { name: /^projects$/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /billing/i })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: /settings/i })).toBeVisible()
  })

  test('unauthenticated user cannot access /projects', async ({ browser }) => {
    // Fresh context with no stored auth state
    const context = await browser.newContext()
    const page = await context.newPage()
    // Register listener BEFORE goto to catch the session check response
    const sessionPromise = page
      .waitForResponse((resp) => resp.url().includes('/api/auth/get-session'), { timeout: 20000 })
      .catch(() => null)
    await page.goto('http://localhost:3000/projects')
    await sessionPromise
    // Client-side auth check returns null → redirects to login
    await page.waitForURL(/\/auth\/login/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/auth\/login/)
    await context.close()
  })
})
