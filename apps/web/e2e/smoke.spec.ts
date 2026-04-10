import { expect, test } from '@playwright/test'

// Smoke tests visit unauthenticated pages — clear global storageState
test.use({ storageState: { cookies: [], origins: [] } })

test('landing page loads and shows app name', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('TaskForge')).toBeVisible()
})

test('navigation links are present when not authenticated', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /login/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /register/i })).toBeVisible()
})

test('health endpoint returns ok', async ({ request }) => {
  // eslint-disable-next-line @typescript-eslint/typedef
  const response = await request.get('http://localhost:4000/health')
  expect(response.ok()).toBe(true)
})
