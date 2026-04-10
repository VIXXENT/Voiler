import { expect, test } from '@playwright/test'

test.describe('Navigation', () => {
  test('authenticated user is redirected from / to /projects', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL('**/projects')
    await expect(page).toHaveURL(/\/projects/)
  })

  test('sidebar shows Projects, Billing, Settings links', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByRole('link', { name: /^projects$/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /billing/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible()
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
