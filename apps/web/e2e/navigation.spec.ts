import { expect, test } from '@playwright/test'

test.describe('Navigation', () => {
  test('authenticated user is redirected from / to /projects', async ({ page }) => {
    await page.goto('/')
    // Give SSR app time to determine auth state and redirect
    await page.waitForURL((url) => url.pathname !== '/', { timeout: 15000 })
    await expect(page).toHaveURL(/\/projects|\/dashboard/)
  })

  test('sidebar shows Projects, Billing, Settings links', async ({ page }) => {
    await page.goto('/projects')
    await page
      .waitForSelector('nav, [role="navigation"], aside', { timeout: 15000 })
      .catch(() => null)
    // Scope to the sidebar nav to avoid ambiguity with project-level links
    const sidebar = page.locator('aside')
    await expect(sidebar.getByRole('link', { name: /^projects$/i })).toBeVisible({ timeout: 10000 })
    await expect(sidebar.getByRole('link', { name: /billing/i })).toBeVisible({ timeout: 10000 })
    await expect(sidebar.getByRole('link', { name: /settings/i })).toBeVisible({ timeout: 10000 })
  })

  test('unauthenticated user cannot access /projects', async ({ browser }) => {
    // Fresh context with no stored auth state
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('http://localhost:3000/projects')
    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/)
    await context.close()
  })
})
