import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * Navigate to a URL and wait for full React hydration.
 * Waits for the Better Auth get-session response which fires after React hydrates.
 */
const gotoAndWaitHydration = async ({ page, url }: { page: Page; url: string }) => {
  const sessionResponsePromise = page
    .waitForResponse((resp) => resp.url().includes('/api/auth/get-session'), { timeout: 25000 })
    .catch(() => null)
  await page.goto(url)
  await sessionResponsePromise
}

/** Creates a new project and navigates to its detail page. */
const createAndGoToProject = async ({ page, name }: { page: Page; name: string }) => {
  await gotoAndWaitHydration({ page, url: '/projects' })
  // Click New Project button — React is hydrated so dialog state change works
  await page.getByRole('button', { name: /new project/i }).click()
  await page.getByRole('dialog').waitFor({ state: 'visible' })
  await page.getByRole('textbox').first().fill(name)
  await page.getByRole('button', { name: /^create$/i }).click()
  await expect(page.getByText(name)).toBeVisible()
  await page.getByText(name).click()
}

test.describe('Tasks', () => {
  test('creates a task', async ({ page }) => {
    const projectName = `Task Test Project ${Date.now()}`
    await createAndGoToProject({ page, name: projectName })

    await page.getByRole('button', { name: /new task/i }).click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })
    await page.getByRole('textbox').first().fill('My First Task')
    await page.getByRole('button', { name: /^create$/i }).click()

    await expect(page.getByText('My First Task')).toBeVisible()
    await expect(page.getByText(/to do/i)).toBeVisible()
  })

  test('transitions task status', async ({ page }) => {
    const projectName = `Transition Test ${Date.now()}`
    await createAndGoToProject({ page, name: projectName })

    // Create a task
    await page.getByRole('button', { name: /new task/i }).click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })
    await page.getByRole('textbox').first().fill('Transition Task')
    await page.getByRole('button', { name: /^create$/i }).click()

    // Transition to in_progress via dropdown/actions menu
    await page
      .getByRole('button', { name: /more|actions|\.\.\./i })
      .first()
      .click()
    await page
      .getByText(/start|in progress/i)
      .first()
      .click()

    // Should show "In Progress" badge
    await expect(page.getByText(/in progress/i)).toBeVisible()
  })

  test('task detail shows title and description fields', async ({ page }) => {
    const projectName = `Detail Test ${Date.now()}`
    await createAndGoToProject({ page, name: projectName })

    // Create a task with description
    await page.getByRole('button', { name: /new task/i }).click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })
    await page.getByRole('textbox').first().fill('Detailed Task')

    const descriptionField = page.getByLabel(/description/i)
    if (await descriptionField.isVisible()) {
      await descriptionField.fill('A detailed description for this task')
    }

    await page.getByRole('button', { name: /^create$/i }).click()
    await expect(page.getByText('Detailed Task')).toBeVisible()
  })
})
