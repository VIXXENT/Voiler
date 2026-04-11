import { expect, test } from '@playwright/test'

test.describe('Billing', () => {
  test('shows billing page with free plan', async ({ page }) => {
    // Register listeners BEFORE goto — responses arrive fast and must not be missed
    const sessionPromise = page
      .waitForResponse((resp) => resp.url().includes('/api/auth/get-session'), { timeout: 20000 })
      .catch(() => null)
    const trpcPromise = page
      .waitForResponse((resp) => resp.url().includes('/trpc/'), { timeout: 20000 })
      .catch(() => null)
    await page.goto('/settings/billing')
    await sessionPromise
    await trpcPromise
    await expect(page.getByText(/billing/i).first()).toBeVisible()
    await expect(page.getByText(/free plan/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible()
  })

  test('upgrade button is enabled in stub mode', async ({ page }) => {
    const sessionPromise = page
      .waitForResponse((resp) => resp.url().includes('/api/auth/get-session'), { timeout: 20000 })
      .catch(() => null)
    const trpcPromise = page
      .waitForResponse((resp) => resp.url().includes('/trpc/'), { timeout: 20000 })
      .catch(() => null)
    await page.goto('/settings/billing')
    await sessionPromise
    await trpcPromise
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeEnabled()
  })
})
