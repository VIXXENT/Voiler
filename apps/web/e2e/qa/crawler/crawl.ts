import fs from 'fs'
import path from 'path'
import { chromium } from '@playwright/test'
import type { APIRequestContext, Browser, BrowserContext, Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_URL = 'http://localhost:4000'
const APP_URL = 'http://localhost:3000'
const QA_DIR = path.resolve(import.meta.dirname, '..')
const SCREENSHOTS_DIR = path.join(QA_DIR, 'screenshots')
const REPORTS_DIR = path.join(QA_DIR, 'reports')
const STATE_PATH = path.join(QA_DIR, 'state', 'test-state.json')

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepRecord = {
  flow: string
  step_name: string
  url: string
  click_count: number
  screenshot_path: string | null
  a11y_tree_path: string | null
  duration_ms: number
  error: string | null
}

type TestAccount = {
  email: string
  password: string
  userId: string
  role: string
  notes: string
}

type TestProject = {
  id: string
  name: string
  ownerId: string
  createdInRun: string
  notes: string
}

type TestTask = {
  id: string
  title: string
  projectId: string
  status: string
  createdInRun: string
}

type TestState = {
  accounts: TestAccount[]
  projects: TestProject[]
  tasks: TestTask[]
  lastUpdated: string | null
}

type CrawlReport = {
  run_id: string
  started_at: string
  finished_at: string | null
  steps: StepRecord[]
  summary: {
    total_steps: number
    errors: number
    screenshots_taken: number
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const runTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
const runId = `qa-run-${Date.now()}`

/** Ensure required directories exist. */
const ensureDirs = () => {
  for (const dir of [SCREENSHOTS_DIR, REPORTS_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

/** Load or initialise the shared test state. */
const loadState = (): TestState => {
  if (fs.existsSync(STATE_PATH)) {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')) as TestState
  }
  return { accounts: [], projects: [], tasks: [], lastUpdated: null }
}

/** Persist test state to disk. */
const saveState = ({ state }: { state: TestState }) => {
  state.lastUpdated = new Date().toISOString()
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
}

/** Call a Better Auth API endpoint. Returns cookies array on success, null on failure. */
const authViaApi = async ({
  request,
  endpoint,
  body,
}: {
  request: APIRequestContext
  endpoint: string
  body: Record<string, string>
}): Promise<string[] | null> => {
  const response = await request
    .post(`${API_URL}${endpoint}`, {
      data: body,
      headers: { 'Content-Type': 'application/json', Origin: APP_URL, Referer: APP_URL },
    })
    .catch(() => null)

  if (!response?.ok()) {
    const text = await response?.text().catch(() => '')
    console.warn(`[crawl] Auth ${endpoint} failed (${response?.status()}): ${text}`)
    return null
  }

  const cookies = response
    .headersArray()
    .filter((h) => h.name.toLowerCase() === 'set-cookie')
    .map((h) => h.value)

  return cookies.length > 0 ? cookies : null
}

/** Get user ID from the Better Auth get-session endpoint. */
const getUserId = async ({ request }: { request: APIRequestContext }): Promise<string | null> => {
  const resp = await request
    .get(`${API_URL}/api/auth/get-session`, {
      headers: { Origin: APP_URL },
    })
    .catch(() => null)

  if (!resp?.ok()) {
    return null
  }

  const body = await resp.json().catch(() => null)
  return (body?.user?.id as string) ?? null
}

/** Delete all projects for the current session (cleanup before fresh crawl). */
const cleanupProjects = async ({ request }: { request: APIRequestContext }) => {
  const resp = await request
    .get(`${API_URL}/trpc/project.list`, { headers: { Origin: APP_URL } })
    .catch(() => null)

  if (!resp?.ok()) {
    return
  }

  const body = await resp.json().catch(() => null)
  const projects: Array<{ id: string }> = (body?.result?.data as Array<{ id: string }>) ?? []

  for (const project of projects) {
    if (!project.id) {
      continue
    }
    await request
      .post(`${API_URL}/trpc/project.delete`, {
        data: { projectId: project.id },
        headers: { 'Content-Type': 'application/json', Origin: APP_URL },
      })
      .catch(() => null)
  }
}

// ---------------------------------------------------------------------------
// Step recorder
// ---------------------------------------------------------------------------

/** Records a single crawl step including screenshot and a11y snapshot. */
const recordStep = async ({
  page,
  flow,
  stepName,
  clickCount,
  steps,
  error,
}: {
  page: Page
  flow: string
  stepName: string
  clickCount: number
  steps: StepRecord[]
  error?: string
}): Promise<StepRecord> => {
  const start = Date.now()
  const slug = stepName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const screenshotName = `${flow}-${slug}.png`
  const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName)
  const a11yName = `${flow}-${slug}.a11y.json`
  const a11yPath = path.join(SCREENSHOTS_DIR, a11yName)

  let screenshotRelative: string | null = null
  let a11yRelative: string | null = null

  await page
    .screenshot({ path: screenshotPath, fullPage: true })
    .then(() => {
      screenshotRelative = `screenshots/${screenshotName}`
    })
    .catch(() => null)

  await page.accessibility
    .snapshot()
    .then((tree) => {
      if (tree) {
        fs.writeFileSync(a11yPath, JSON.stringify(tree, null, 2))
        a11yRelative = `screenshots/${a11yName}`
      }
    })
    .catch(() => null)

  const record: StepRecord = {
    flow,
    step_name: stepName,
    url: page.url(),
    click_count: clickCount,
    screenshot_path: screenshotRelative,
    a11y_tree_path: a11yRelative,
    duration_ms: Date.now() - start,
    error: error ?? null,
  }

  steps.push(record)
  console.log(`[crawl] ${flow} / ${stepName} — ${error ? 'ERROR: ' + error : 'OK'}`)
  return record
}

// ---------------------------------------------------------------------------
// Flow helpers
// ---------------------------------------------------------------------------

/** Wait for React hydration via get-session response. */
const waitForHydration = async ({ page }: { page: Page }) => {
  const sessionPromise = page
    .waitForResponse((r) => r.url().includes('/api/auth/get-session'), { timeout: 25000 })
    .catch(() => null)
  await sessionPromise
}

/** Navigate and wait for hydration. */
const gotoHydrated = async ({ page, url }: { page: Page; url: string }) => {
  const sessionPromise = page
    .waitForResponse((r) => r.url().includes('/api/auth/get-session'), { timeout: 25000 })
    .catch(() => null)
  await page.goto(url)
  await sessionPromise
}

/** Open a dialog by clicking a button. Retries once if dialog does not appear. */
const openDialog = async ({ page, buttonName }: { page: Page; buttonName: RegExp }) => {
  const btn = page.getByRole('button', { name: buttonName })
  const dialog = page.getByRole('dialog')

  await btn.click()
  const opened = await dialog
    .waitFor({ state: 'visible', timeout: 8000 })
    .then(() => true)
    .catch(() => false)

  if (!opened) {
    await page.waitForTimeout(500)
    await btn.click()
    await dialog.waitFor({ state: 'visible', timeout: 8000 })
  }
}

// ---------------------------------------------------------------------------
// Flows
// ---------------------------------------------------------------------------

/** Flow: Registration with a fresh unique account. */
const flowRegistration = async ({
  page,
  context,
  steps,
  state,
}: {
  page: Page
  context: BrowserContext
  steps: StepRecord[]
  state: TestState
}): Promise<{ email: string; password: string; userId: string }> => {
  const email = `qa-${Date.now()}@taskforge-qa.test`
  const password = `QaPass_${Date.now()}!`
  let clickCount = 0

  // Register via API (avoids UI timing issues, mirrors global-setup approach)
  const cookies = await authViaApi({
    request: context.request,
    endpoint: '/api/auth/sign-up/email',
    body: { email, password, name: 'QA Crawler User' },
  })

  if (!cookies) {
    await recordStep({
      page,
      flow: 'auth',
      stepName: 'register-api-failed',
      clickCount,
      steps,
      error: 'API registration failed',
    })
    throw new Error('[crawl] Registration API failed')
  }

  // Now visit the registration form for visual/UX crawl
  await page.goto(`${APP_URL}/auth/register`)
  await page.waitForLoadState('domcontentloaded')
  await recordStep({ page, flow: 'auth', stepName: '01-register-form', clickCount, steps })

  // Navigate to projects to confirm session
  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page
    .getByRole('button', { name: /sign out/i })
    .waitFor({ state: 'visible', timeout: 15000 })
  await recordStep({
    page,
    flow: 'auth',
    stepName: '02-register-success-projects',
    clickCount,
    steps,
  })

  const userId = await getUserId({ request: context.request })

  const account: TestAccount = {
    email,
    password,
    userId: userId ?? '',
    role: 'owner',
    notes: `Created in run ${runId}`,
  }
  state.accounts.push(account)
  saveState({ state })

  return { email, password, userId: userId ?? '' }
}

/** Flow: Login page visit (visual only — session is already active). */
const flowLoginVisual = async ({ page, steps }: { page: Page; steps: StepRecord[] }) => {
  await page.goto(`${APP_URL}/auth/login`)
  await page.waitForLoadState('domcontentloaded')
  await recordStep({ page, flow: 'auth', stepName: '03-login-form-empty', steps, clickCount: 0 })

  // Show invalid credentials error
  await page.getByRole('textbox', { name: /email/i }).fill('invalid@example.com')
  await page.getByLabel(/password/i).fill('wrongpassword')
  await page.getByRole('button', { name: /log\s*in|sign\s*in/i }).click()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1000)
  await recordStep({
    page,
    flow: 'auth',
    stepName: '04-login-invalid-credentials',
    steps,
    clickCount: 1,
  })
}

/** Flow: Projects list — empty state. */
const flowProjectsEmpty = async ({ page, steps }: { page: Page; steps: StepRecord[] }) => {
  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page
    .getByRole('button', { name: /sign out/i })
    .waitFor({ state: 'visible', timeout: 15000 })
  await recordStep({
    page,
    flow: 'projects',
    stepName: '01-projects-empty-state',
    steps,
    clickCount: 0,
  })
}

/** Flow: Create a project and record all steps. */
const flowCreateProject = async ({
  page,
  steps,
  state,
  userId,
}: {
  page: Page
  steps: StepRecord[]
  state: TestState
  userId: string
}): Promise<string> => {
  const projectName = `QA Project ${Date.now()}`
  let clickCount = 0

  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page
    .getByRole('button', { name: /sign out/i })
    .waitFor({ state: 'visible', timeout: 15000 })

  // Open dialog
  await openDialog({ page, buttonName: /new project/i })
  clickCount++
  await recordStep({
    page,
    flow: 'projects',
    stepName: '02-create-project-dialog',
    steps,
    clickCount,
  })

  // Fill form
  await page.getByRole('textbox').first().fill(projectName)
  await recordStep({
    page,
    flow: 'projects',
    stepName: '03-create-project-form-filled',
    steps,
    clickCount,
  })

  // Submit
  await page.getByRole('button', { name: /^create$/i }).click()
  clickCount++
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 })
  await recordStep({
    page,
    flow: 'projects',
    stepName: '04-create-project-success',
    steps,
    clickCount,
  })

  // Get project card href
  const projectCard = page.locator('a[href*="/projects/"]').filter({ hasText: projectName }).first()
  const href = await projectCard.getAttribute('href')

  // Extract project ID from href
  const projectId = href?.split('/projects/')[1]?.split('/')[0] ?? ''

  const project: TestProject = {
    id: projectId,
    name: projectName,
    ownerId: userId,
    createdInRun: runId,
    notes: '',
  }
  state.projects.push(project)
  saveState({ state })

  await recordStep({
    page,
    flow: 'projects',
    stepName: '05-projects-list-with-project',
    steps,
    clickCount,
  })
  return href ?? '/projects'
}

/** Flow: Project detail — Tasks tab. */
const flowProjectDetailTasks = async ({
  page,
  steps,
  projectHref,
}: {
  page: Page
  steps: StepRecord[]
  projectHref: string
}) => {
  await page.goto(projectHref)
  await page.getByRole('link', { name: /tasks/i }).waitFor({ state: 'visible', timeout: 15000 })
  await recordStep({
    page,
    flow: 'project-detail',
    stepName: '01-tasks-tab-empty',
    steps,
    clickCount: 0,
  })
}

/** Flow: Create a task. */
const flowCreateTask = async ({
  page,
  steps,
  state,
  projectId,
  projectHref,
}: {
  page: Page
  steps: StepRecord[]
  state: TestState
  projectId: string
  projectHref: string
}): Promise<void> => {
  let clickCount = 0

  await page.goto(projectHref)
  await page.getByRole('link', { name: /tasks/i }).waitFor({ state: 'visible', timeout: 15000 })

  // Open new task dialog
  await openDialog({ page, buttonName: /new task/i })
  clickCount++
  await recordStep({ page, flow: 'tasks', stepName: '01-create-task-dialog', steps, clickCount })

  // Fill title
  const taskTitle = 'QA Crawl Task'
  await page.getByRole('textbox').first().fill(taskTitle)

  // Fill description if present
  const descField = page.getByLabel(/description/i)
  if (await descField.isVisible().catch(() => false)) {
    await descField.fill('Task created by QA crawler')
  }

  await recordStep({
    page,
    flow: 'tasks',
    stepName: '02-create-task-form-filled',
    steps,
    clickCount,
  })

  // Submit
  await page.getByRole('button', { name: /^create$/i }).click()
  clickCount++
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 })
  await page.getByText(taskTitle).waitFor({ state: 'visible', timeout: 10000 })
  await recordStep({ page, flow: 'tasks', stepName: '03-task-created-in-list', steps, clickCount })

  // Save task to state (no ID available from UI — record what we know)
  const task: TestTask = {
    id: '',
    title: taskTitle,
    projectId,
    status: 'todo',
    createdInRun: runId,
  }
  state.tasks.push(task)
  saveState({ state })
}

/** Flow: Task status transition. */
const flowTaskStatusTransition = async ({ page, steps }: { page: Page; steps: StepRecord[] }) => {
  let clickCount = 0

  // Open actions menu or status dropdown
  const actionsBtn = page.getByRole('button', { name: /more|actions|\.\.\./i }).first()
  const hasActions = await actionsBtn.isVisible().catch(() => false)

  if (hasActions) {
    await actionsBtn.click()
    clickCount++
    await recordStep({
      page,
      flow: 'tasks',
      stepName: '04-task-actions-menu-open',
      steps,
      clickCount,
    })

    const startOption = page.getByText(/start|in progress/i).first()
    const hasStart = await startOption.isVisible().catch(() => false)
    if (hasStart) {
      await startOption.click()
      clickCount++
      await page.waitForTimeout(500)
      await recordStep({
        page,
        flow: 'tasks',
        stepName: '05-task-status-in-progress',
        steps,
        clickCount,
      })
    }
  } else {
    await recordStep({
      page,
      flow: 'tasks',
      stepName: '04-task-status-control-not-found',
      steps,
      clickCount,
      error: 'Status control not located — WARN',
    })
  }
}

/** Flow: Members tab. */
const flowMembersTab = async ({
  page,
  steps,
  projectHref,
}: {
  page: Page
  steps: StepRecord[]
  projectHref: string
}) => {
  await page.goto(projectHref)
  await page.getByRole('link', { name: /tasks/i }).waitFor({ state: 'visible', timeout: 15000 })

  const membersLink = page.getByRole('link', { name: /members/i })
  await membersLink.click()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
  await recordStep({ page, flow: 'members', stepName: '01-members-tab', steps, clickCount: 1 })
}

/** Flow: Settings tab. */
const flowSettingsTab = async ({
  page,
  steps,
  projectHref,
}: {
  page: Page
  steps: StepRecord[]
  projectHref: string
}) => {
  await page.goto(projectHref)
  await page.getByRole('link', { name: /tasks/i }).waitFor({ state: 'visible', timeout: 15000 })

  const settingsLink = page.locator(`a[href*="/projects/"][href$="/settings"]`).first()
  await settingsLink.click()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
  await recordStep({
    page,
    flow: 'project-settings',
    stepName: '01-settings-tab',
    steps,
    clickCount: 1,
  })
}

/** Flow: Billing page. */
const flowBilling = async ({ page, steps }: { page: Page; steps: StepRecord[] }) => {
  await gotoHydrated({ page, url: `${APP_URL}/billing` })
  await page.waitForTimeout(500)
  await recordStep({ page, flow: 'billing', stepName: '01-billing-page', steps, clickCount: 0 })
}

/** Flow: Sidebar navigation links. */
const flowNavigation = async ({ page, steps }: { page: Page; steps: StepRecord[] }) => {
  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page
    .getByRole('button', { name: /sign out/i })
    .waitFor({ state: 'visible', timeout: 15000 })
  await recordStep({
    page,
    flow: 'navigation',
    stepName: '01-sidebar-projects-active',
    steps,
    clickCount: 0,
  })

  // Click Billing in sidebar
  const sidebar = page.locator('aside')
  await sidebar.getByRole('link', { name: /billing/i }).click()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
  await recordStep({
    page,
    flow: 'navigation',
    stepName: '02-sidebar-billing-link',
    steps,
    clickCount: 1,
  })

  // Click Settings in sidebar
  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page
    .getByRole('button', { name: /sign out/i })
    .waitFor({ state: 'visible', timeout: 15000 })
  await sidebar.getByRole('link', { name: /settings/i }).click()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
  await recordStep({
    page,
    flow: 'navigation',
    stepName: '03-sidebar-settings-link',
    steps,
    clickCount: 1,
  })
}

/** Flow: Sign out and verify unauthenticated state. */
const flowSignOut = async ({ page, steps }: { page: Page; steps: StepRecord[] }) => {
  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page
    .getByRole('button', { name: /sign out/i })
    .waitFor({ state: 'visible', timeout: 15000 })

  await page.getByRole('button', { name: /sign out/i }).click()
  await page.waitForTimeout(1000)
  await recordStep({ page, flow: 'auth', stepName: '05-signed-out', steps, clickCount: 1 })

  // Verify redirect to home or login
  await recordStep({ page, flow: 'auth', stepName: '06-post-signout-page', steps, clickCount: 0 })
}

/** Flow: Login again with existing credentials (session replay). */
const flowLoginReturning = async ({
  page,
  context,
  steps,
  email,
  password,
}: {
  page: Page
  context: BrowserContext
  steps: StepRecord[]
  email: string
  password: string
}) => {
  // Use API auth (mirrors global-setup approach for reliability)
  const cookies = await authViaApi({
    request: context.request,
    endpoint: '/api/auth/sign-in/email',
    body: { email, password },
  })

  if (!cookies) {
    await recordStep({
      page,
      flow: 'auth',
      stepName: '07-login-returning-failed',
      steps,
      clickCount: 0,
      error: 'API sign-in failed',
    })
    return
  }

  // Visit login page for visual crawl
  await page.goto(`${APP_URL}/auth/login`)
  await page.waitForLoadState('domcontentloaded')
  await recordStep({
    page,
    flow: 'auth',
    stepName: '07-login-returning-form',
    steps,
    clickCount: 0,
  })

  // Then navigate to projects using the API session
  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page.waitForTimeout(500)
  await recordStep({
    page,
    flow: 'auth',
    stepName: '08-login-returning-success',
    steps,
    clickCount: 0,
  })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/** Main crawl entry point. Runs all flows and writes the report. */
const main = async () => {
  ensureDirs()

  const state = loadState()
  const steps: StepRecord[] = []
  const startedAt = new Date().toISOString()

  console.log(`[crawl] Starting run ${runId}`)

  let browser: Browser | null = null

  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ baseURL: APP_URL })
    const page = await context.newPage()

    // --- Auth flows ---
    const { email, password, userId } = await flowRegistration({ page, context, steps, state })

    await flowLoginVisual({ page, steps })

    // Navigate back to app (restore session)
    await gotoHydrated({ page, url: `${APP_URL}/projects` })

    // Clean up any stale projects so we start fresh
    await cleanupProjects({ request: context.request })

    // --- Projects flows ---
    await flowProjectsEmpty({ page, steps })
    const projectHref = await flowCreateProject({ page, steps, state, userId })

    // Extract project ID from state
    const projectId = state.projects.at(-1)?.id ?? ''

    // --- Tasks flows ---
    await flowProjectDetailTasks({ page, steps, projectHref })
    await flowCreateTask({ page, steps, state, projectId, projectHref })
    await flowTaskStatusTransition({ page, steps })

    // --- Members flow ---
    await flowMembersTab({ page, steps, projectHref })

    // --- Settings flow ---
    await flowSettingsTab({ page, steps, projectHref })

    // --- Billing flow ---
    await flowBilling({ page, steps })

    // --- Navigation flow ---
    await flowNavigation({ page, steps })

    // --- Sign out ---
    await flowSignOut({ page, steps })

    // --- Login again ---
    const freshContext = await browser.newContext({ baseURL: APP_URL })
    const freshPage = await freshContext.newPage()
    await flowLoginReturning({ page: freshPage, context: freshContext, steps, email, password })
    await freshContext.close()

    await context.close()
  } finally {
    await browser?.close()
  }

  const finishedAt = new Date().toISOString()
  const errors = steps.filter((s) => s.error !== null).length
  const screenshots = steps.filter((s) => s.screenshot_path !== null).length

  const report: CrawlReport = {
    run_id: runId,
    started_at: startedAt,
    finished_at: finishedAt,
    steps,
    summary: {
      total_steps: steps.length,
      errors,
      screenshots_taken: screenshots,
    },
  }

  const reportPath = path.join(REPORTS_DIR, `crawl-${runTimestamp}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  console.log(`[crawl] Done. ${steps.length} steps, ${errors} errors, ${screenshots} screenshots`)
  console.log(`[crawl] Report: ${reportPath}`)
}

main().catch((err: unknown) => {
  console.error('[crawl] Fatal error:', err)
  process.exit(1)
})
