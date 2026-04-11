import { expect, test } from '@playwright/test'

test.describe('Billing', () => {
  test('shows billing page with free plan', async ({ page }) => {
    await page.goto('/settings/billing')
    await page.waitForSelector('h1, h2', { timeout: 15000 }).catch(() => null)
    await expect(page.getByText(/billing/i).first()).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/free plan/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible({
      timeout: 10000,
    })
  })

  test('upgrade button is enabled in stub mode', async ({ page }) => {
    await page.goto('/settings/billing')
    await page.waitForSelector('button', { timeout: 15000 }).catch(() => null)
    // In stub mode, no real Stripe involved — verify button exists and is not disabled
    const upgradeBtn = page.getByRole('button', { name: /upgrade to pro/i })
    await expect(upgradeBtn).toBeEnabled({ timeout: 10000 })
  })
})
