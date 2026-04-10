import { expect, test } from '@playwright/test'

test.describe('Projects', () => {
  test('shows projects page after login', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible()
  })

  test('creates a new project', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /new project/i }).click()

    await page.getByLabel(/name/i).fill('E2E Test Project')
    await page.getByRole('button', { name: /^create$/i }).click()

    // Project appears in list
    await expect(page.getByText('E2E Test Project')).toBeVisible()
  })

  test('navigates to project detail', async ({ page }) => {
    await page.goto('/projects')
    // Click on the project card created in the previous test
    await page.getByText('E2E Test Project').click()

    // Should show project detail with navigation links
    await expect(page.getByRole('link', { name: /tasks/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /members/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible()
  })

  test('shows empty state when no tasks', async ({ page }) => {
    await page.goto('/projects')
    await page.getByText('E2E Test Project').click()
    await expect(page.getByText(/no tasks/i)).toBeVisible()
  })
})
