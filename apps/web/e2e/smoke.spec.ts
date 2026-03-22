import { test, expect } from '@playwright/test'

test.describe('GemTest Smoke Test', () => {
  test('should load the dashboard correctly', async ({ page }) => {
    // Navigate to the app
    await page.goto('/', { waitUntil: 'networkidle' })

    // Check for the main title using role and regex
    await expect(page.getByRole('heading', { name: /GemTest Monorepo/i })).toBeVisible({ timeout: 15000 })
  })
})
