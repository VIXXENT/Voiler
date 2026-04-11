import { expect, test } from '@playwright/test'

test.describe('Billing', () => {
  test('shows billing page with free plan', async ({ page }) => {
    await page.goto('/settings/billing')
    // Wait for full hydration: Sign out button appears only after auth session resolves
    await page.getByRole('button', { name: /sign out/i }).waitFor({ state: 'visible' })
    // Wait for billing tRPC query (subscription data renders asynchronously)
    await expect(page.getByText(/billing/i).first()).toBeVisible()
    await expect(page.getByText(/free plan/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible()
  })

  test('upgrade button is enabled in stub mode', async ({ page }) => {
    await page.goto('/settings/billing')
    await page.getByRole('button', { name: /sign out/i }).waitFor({ state: 'visible' })
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeEnabled()
  })
})
