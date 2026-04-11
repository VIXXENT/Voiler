import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Navigate to a URL and wait for full React hydration.
 * Waits for the Better Auth get-session response which fires after React hydrates
 * and authClient.useSession() makes its first call.
 */
const gotoAndWaitHydration = async ({ page, url }: { page: Page; url: string }) => {
  // Register response listener BEFORE navigation to catch the early get-session call
  const sessionResponsePromise = page
    .waitForResponse((resp) => resp.url().includes('/api/auth/get-session'), { timeout: 25000 })
    .catch(() => null)
  await page.goto(url)
  await sessionResponsePromise
}

/** Opens the New Project dialog, retrying the click if needed. */
const openNewProjectDialog = async ({ page }: { page: Page }) => {
  const btn = page.getByRole('button', { name: /new project/i })
  const dialog = page.getByRole('dialog')
  await btn.click()
  const opened = await dialog
    .waitFor({ state: 'visible', timeout: 8000 })
    .then(() => true)
    .catch(() => false)
  if (opened) return
  // Retry once with a short pause to let React finish pending state updates
  await page.waitForTimeout(500)
  await btn.click()
  await dialog.waitFor({ state: 'visible', timeout: 8000 })
}

/** Creates a new project and navigates to its detail page. */
const createAndGoToProject = async ({ page, name }: { page: Page; name: string }) => {
  await gotoAndWaitHydration({ page, url: '/projects' })
  await openNewProjectDialog({ page })
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
    await openNewProjectDialog({ page })
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
