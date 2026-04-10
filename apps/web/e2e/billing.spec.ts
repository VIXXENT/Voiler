import { expect, test } from '@playwright/test'

test.describe('Billing', () => {
  test('shows billing page with free plan', async ({ page }) => {
    await page.goto('/settings/billing')
    await expect(page.getByText(/billing/i)).toBeVisible()
    await expect(page.getByText(/free plan/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible()
  })

  test('upgrade button is enabled in stub mode', async ({ page }) => {
    await page.goto('/settings/billing')
    // In stub mode, no real Stripe involved — verify button exists and is not disabled
    const upgradeBtn = page.getByRole('button', { name: /upgrade to pro/i })
    await expect(upgradeBtn).toBeEnabled()
  })
})
