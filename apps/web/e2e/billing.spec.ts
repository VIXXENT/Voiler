import { expect, test } from '@playwright/test'

test.describe('Billing', () => {
  test('shows billing page with free plan', async ({ page }) => {
    await page.goto('/settings/billing')
    // Wait for tRPC billing query to complete (subscription data loads async)
    await page
      .waitForResponse(
        (resp) => resp.url().includes('getSubscription') || resp.url().includes('/trpc/'),
        { timeout: 20000 },
      )
      .catch(() => null)
    // Wait for sidebar to confirm app is rendered
    await page
      .locator('aside')
      .waitFor({ state: 'visible', timeout: 20000 })
      .catch(() => null)
    await expect(page.getByText(/billing/i).first()).toBeVisible()
    await expect(page.getByText(/free plan/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible()
  })

  test('upgrade button is enabled in stub mode', async ({ page }) => {
    await page.goto('/settings/billing')
    await page
      .locator('aside')
      .waitFor({ state: 'visible', timeout: 20000 })
      .catch(() => null)
    // In stub mode, no real Stripe involved — verify button exists and is not disabled
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeEnabled()
  })
})
