import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/** Creates a new project and navigates to its detail page. */
const createAndGoToProject = async ({ page, name }: { page: Page; name: string }) => {
  await page.goto('/projects')
  await page.waitForSelector('button', { timeout: 15000 }).catch(() => null)
  await page.getByRole('button', { name: /new project/i }).click({ timeout: 10000 })
  await page.getByLabel(/name/i).fill(name)
  await page.getByRole('button', { name: /^create$/i }).click()
  await expect(page.getByText(name)).toBeVisible({ timeout: 10000 })
  await page.getByText(name).click()
}

test.describe('Projects', () => {
  test('shows projects page after login', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForSelector('h1, button', { timeout: 15000 }).catch(() => null)
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible({ timeout: 10000 })
  })

  test('creates a new project', async ({ page }) => {
    const projectName = `Create Test ${Date.now()}`
    await page.goto('/projects')
    await page.waitForSelector('button', { timeout: 15000 }).catch(() => null)
    await page.getByRole('button', { name: /new project/i }).click({ timeout: 10000 })

    await page.getByLabel(/name/i).fill(projectName)
    await page.getByRole('button', { name: /^create$/i }).click()

    // Project appears in list
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 10000 })
  })

  test('navigates to project detail', async ({ page }) => {
    const projectName = `Detail Nav Test ${Date.now()}`
    await createAndGoToProject({ page, name: projectName })

    // Should show project detail with navigation links
    await expect(page.getByRole('link', { name: /tasks/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: /members/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible({ timeout: 10000 })
  })

  test('shows empty state when no tasks', async ({ page }) => {
    const projectName = `Empty State Test ${Date.now()}`
    await createAndGoToProject({ page, name: projectName })
    await expect(page.getByText(/no tasks/i)).toBeVisible({ timeout: 10000 })
  })
})
