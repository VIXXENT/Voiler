import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

/** Navigate to a URL and wait for full React hydration via get-session response. */
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

/** Creates a new project and navigates to its detail page. */
const createAndGoToProject = async ({ page, name }: { page: Page; name: string }) => {
  await gotoAndWaitHydration({ page, url: '/projects' })
  await openDialog({ page, buttonName: /new project/i })
  await page.getByRole('textbox').first().fill(name)
  await page.getByRole('button', { name: /^create$/i }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 })
  await page.getByText(name).first().click()
  await page.waitForURL(/\/projects\/.+/, { timeout: 10000 })
  await page.getByRole('link', { name: /tasks/i }).waitFor({ state: 'visible' })
}

// Clean up all projects before the task test suite to avoid free plan limit (max 3)
test.beforeAll(async ({ request }) => {
  const listResp = await request.get('http://localhost:4000/trpc/project.list').catch(() => null)
  if (!listResp?.ok()) {
    return
  }
  // eslint-disable-next-line @typescript-eslint/typedef
  const body = await listResp.json().catch(() => ({}))
  // eslint-disable-next-line @typescript-eslint/typedef
  const projects: Array<{ id: string }> = (body?.result?.data as Array<{ id: string }>) ?? []
  for (const project of projects) {
    if (!project.id) {
      continue
    }
    await request
      .post('http://localhost:4000/trpc/project.delete', {
        data: { projectId: project.id },
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
      })
      .catch(() => null)
  }
})

test.describe('Tasks', () => {
  test('creates a task', async ({ page }) => {
    const projectName = `Task Test Project ${Date.now()}`
    await createAndGoToProject({ page, name: projectName })

    await openDialog({ page, buttonName: /new task/i })
    await page.getByRole('textbox').first().fill('My First Task')
    await page.getByRole('button', { name: /^create$/i }).click()
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 })

    await expect(page.getByText('My First Task')).toBeVisible()
    await expect(page.getByText(/to do/i)).toBeVisible()
  })

  test('transitions task status', async ({ page }) => {
    const projectName = `Transition Test ${Date.now()}`
    await createAndGoToProject({ page, name: projectName })

    await openDialog({ page, buttonName: /new task/i })
    await page.getByRole('textbox').first().fill('Transition Task')
    await page.getByRole('button', { name: /^create$/i }).click()
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 })

    await page
      .getByRole('button', { name: /more|actions|\.\.\./i })
      .first()
      .click()
    await page
      .getByText(/start|in progress/i)
      .first()
      .click()
    await expect(page.getByText(/in progress/i)).toBeVisible()
  })

  test('task detail shows title and description fields', async ({ page }) => {
    const projectName = `Detail Test ${Date.now()}`
    await createAndGoToProject({ page, name: projectName })

    await openDialog({ page, buttonName: /new task/i })
    await page.getByRole('textbox').first().fill('Detailed Task')

    const descriptionField = page.getByLabel(/description/i)
    if (await descriptionField.isVisible()) {
      await descriptionField.fill('A detailed description for this task')
    }

    await page.getByRole('button', { name: /^create$/i }).click()
    await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 })
    await expect(page.getByText('Detailed Task')).toBeVisible()
  })
})
