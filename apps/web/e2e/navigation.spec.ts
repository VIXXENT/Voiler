import { expect, test } from '@playwright/test'

test.describe('Navigation', () => {
  test('authenticated user can access /projects directly', async ({ page }) => {
    await page.goto('/projects')
    // Wait for client-side auth check to complete and app to render
    const sidebar = page.locator('aside')
    await expect(sidebar).toBeVisible({ timeout: 20000 })
    await expect(page).toHaveURL(/\/projects/)
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
    // Client-side auth check redirects to login (SSR skips check; client runs it)
    await page.waitForURL(/\/auth\/login/, { timeout: 20000 })
    await expect(page).toHaveURL(/\/auth\/login/)
    await context.close()
  })
})
