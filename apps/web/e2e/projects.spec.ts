import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Navigate to a URL and wait for full React hydration + auth resolution.
 * Waits for the "Sign out" button which only renders after authClient.useSession()
 * resolves with real session data — the most reliable post-hydration indicator.
 */
const gotoAndWaitHydration = async ({ page, url }: { page: Page; url: string }) => {
  await page.goto(url)
  await page
    .getByRole('button', { name: /sign out/i })
    .waitFor({ state: 'visible', timeout: 25000 })
}

/** Creates a new project and navigates to its detail page. */
const createAndGoToProject = async ({ page, name }: { page: Page; name: string }) => {
  await gotoAndWaitHydration({ page, url: '/projects' })
  // Click after hydration — React event handlers are now attached
  await page.getByRole('button', { name: /new project/i }).click()
  // Wait for Radix Dialog to open
  await page.getByRole('dialog').waitFor({ state: 'visible' })
  await page.getByRole('textbox').first().fill(name)
  await page.getByRole('button', { name: /^create$/i }).click()
  await expect(page.getByText(name)).toBeVisible()
  await page.getByText(name).click()
}

test.describe('Projects', () => {
  test('shows projects page after login', async ({ page }) => {
    await gotoAndWaitHydration({ page, url: '/projects' })
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible()
  })

  test('creates a new project', async ({ page }) => {
    const projectName = `Create Test ${Date.now()}`
    await gotoAndWaitHydration({ page, url: '/projects' })
    await page.getByRole('button', { name: /new project/i }).click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })
    await page.getByRole('textbox').first().fill(projectName)
    await page.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText(projectName)).toBeVisible()
  })

  test('navigates to project detail', async ({ page }) => {
    const projectName = `Detail Nav Test ${Date.now()}`
    await createAndGoToProject({ page, name: projectName })
    await expect(page.getByRole('link', { name: /tasks/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /members/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible()
  })

  test('shows empty state when no tasks', async ({ page }) => {
    const projectName = `Empty State Test ${Date.now()}`
    await createAndGoToProject({ page, name: projectName })
    await expect(page.getByText(/no tasks/i)).toBeVisible()
  })
})
