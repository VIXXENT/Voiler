import { expect, test } from '@playwright/test'

test.describe('Billing', () => {
  test('shows billing page with free plan', async ({ page }) => {
    // Navigate to /projects first — full page load with React hydration + tRPC working
    await page.goto('/projects')
    // Wait for the first tRPC response to confirm JS is hydrated and API is reachable
    await page
      .waitForResponse((resp) => resp.url().includes(':4000/trpc'), { timeout: 20000 })
      .catch(() => null)
    // SPA-navigate to billing via sidebar link — avoids SSR-without-JS issue on direct goto
    await page.getByRole('link', { name: /^billing$/i }).click()
    await page.waitForURL(/\/settings\/billing/, { timeout: 10000 })
    // Wait for subscription tRPC query to resolve — upgrade button appears for free plan
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible({
      timeout: 30000,
    })
    await expect(page.getByText(/free plan/i)).toBeVisible({ timeout: 10000 })
  })

  test('upgrade button is enabled in stub mode', async ({ page }) => {
    // Same SPA navigation pattern to ensure JS is running
    await page.goto('/projects')
    await page
      .waitForResponse((resp) => resp.url().includes(':4000/trpc'), { timeout: 20000 })
      .catch(() => null)
    await page.getByRole('link', { name: /^billing$/i }).click()
    await page.waitForURL(/\/settings\/billing/, { timeout: 10000 })
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeEnabled({
      timeout: 30000,
    })
  })
})
