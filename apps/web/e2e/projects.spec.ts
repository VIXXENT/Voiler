import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Navigate to a URL and wait for full React hydration.
 * Registers the response listener BEFORE navigation to catch the early get-session call.
 */
const gotoAndWaitHydration = async ({ page, url }: { page: Page; url: string }) => {
  const sessionResponsePromise = page
    .waitForResponse((resp) => resp.url().includes('/api/auth/get-session'), { timeout: 25000 })
    .catch(() => null)
  await page.goto(url)
  await sessionResponsePromise
}

/** Opens a button-triggered dialog, retrying the click once if needed. */
const openDialog = async ({ page, buttonName }: { page: Page; buttonName: RegExp }) => {
  const btn = page.getByRole('button', { name: buttonName })
  const dialog = page.getByRole('dialog')
  await btn.click()
  const opened = await dialog
    .waitFor({ state: 'visible', timeout: 8000 })
    .then(() => true)
    .catch(() => false)
  if (opened) {
    return
  }
  await page.waitForTimeout(500)
  await btn.click()
  await dialog.waitFor({ state: 'visible', timeout: 8000 })
}

/** Creates a new project, waits for dialog to close, and navigates to its detail page. */
const createAndGoToProject = async ({ page, name }: { page: Page; name: string }) => {
  await gotoAndWaitHydration({ page, url: '/projects' })
  await openDialog({ page, buttonName: /new project/i })
  await page.getByRole('textbox').first().fill(name)
  await page.getByRole('button', { name: /^create$/i }).click()
  // Dialog closes when mutation succeeds
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 })
  // Click project card and wait for SPA navigation to detail page
  await page.getByText(name).first().click()
  await page.waitForURL(/\/projects\/.+/, { timeout: 10000 })
  // Wait for detail page tabs to confirm page is loaded
  await page.getByRole('link', { name: /tasks/i }).waitFor({ state: 'visible' })
}

test.describe('Projects', () => {
  test('shows projects page after login', async ({ page }) => {
    await gotoAndWaitHydration({ page, url: '/projects' })
    await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible()
  })

  test('creates a new project', async ({ page }) => {
    const projectName = `Create Test ${Date.now()}`
    await gotoAndWaitHydration({ page, url: '/projects' })
    await openDialog({ page, buttonName: /new project/i })
    await page.getByRole('textbox').first().fill(projectName)
    await page.getByRole('button', { name: /^create$/i }).click()
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 })
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
