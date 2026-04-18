import fs from 'fs'
import path from 'path'
import { chromium } from '@playwright/test'
import type { APIRequestContext, Browser, BrowserContext, Page } from '@playwright/test'
import type {
  ConsoleLog,
  CookieEntry,
  CrawlReport,
  Issue,
  LegacyCrawlReport,
  NetworkEvent,
  PerformanceTelemetry,
  ResourceTiming,
  StackFrame,
  StepAuth,
  StepMeta,
  StepRecord,
  StepTelemetry,
  StorageSnapshot,
  TestAccount,
  TestProject,
  TestState,
  TestTask,
} from './types.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_URL = 'http://localhost:4000'
const APP_URL = 'http://localhost:3000'
const QA_DIR = path.resolve(import.meta.dirname, '..')
const SCREENSHOTS_DIR = path.join(QA_DIR, 'screenshots')
const REPORTS_DIR = path.join(QA_DIR, 'reports')
const STATE_PATH = path.join(QA_DIR, 'state', 'test-state.json')

const runTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
const runId = `qa-run-${Date.now()}`

/** Max bytes captured for request/response JSON bodies. Bodies larger than this are truncated. */
const BODY_CAPTURE_LIMIT_BYTES = 10_240 // 10 KB

// ---------------------------------------------------------------------------
// TelemetryCollector
// ---------------------------------------------------------------------------

/** Redact session-like tokens from cookie values (replace middle with ***). */
const redactCookieValue = ({ value }: { value: string }): string => {
  // Heuristic: value longer than 20 chars that looks like a token
  if (value.length > 20 && /^[A-Za-z0-9._\-+/=]+$/.test(value)) {
    const keep = 4
    return `${value.slice(0, keep)}***${value.slice(-keep)}`
  }
  return value
}

/** Capture browser storage + cookies for the current page. */
const captureStorage = async ({ page }: { page: Page }): Promise<StorageSnapshot> => {
  const raw = await page
    .evaluate(() => ({
      localStorage: Object.fromEntries(
        Array.from({ length: localStorage.length }, (_, i) => {
          const key = localStorage.key(i) ?? ''
          return [key, localStorage.getItem(key) ?? '']
        }),
      ),
      sessionStorage: Object.fromEntries(
        Array.from({ length: sessionStorage.length }, (_, i) => {
          const key = sessionStorage.key(i) ?? ''
          return [key, sessionStorage.getItem(key) ?? '']
        }),
      ),
    }))
    .catch(() => ({ localStorage: {}, sessionStorage: {} }))

  const rawCookies = await page
    .context()
    .cookies()
    .catch(() => [])

  const cookies: CookieEntry[] = rawCookies.map((c) => ({
    name: c.name,
    value: redactCookieValue({ value: c.value }),
    domain: c.domain,
    path: c.path,
    httpOnly: c.httpOnly,
    secure: c.secure,
    sameSite: c.sameSite,
  }))

  return { localStorage: raw.localStorage, sessionStorage: raw.sessionStorage, cookies }
}

/** Capture navigation performance timing for the current page. */
const capturePerformance = async ({
  page,
}: {
  page: Page
}): Promise<PerformanceTelemetry | null> => {
  return page
    .evaluate((): PerformanceTelemetry | null => {
      const nav = performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined
      if (!nav) {
        return null
      }
      const resources: ResourceTiming[] = performance.getEntriesByType('resource').map((r) => {
        const res = r as PerformanceResourceTiming
        return {
          name: res.name,
          durationMs: res.duration,
          type: res.initiatorType,
          transferSize: res.transferSize,
        }
      })
      return {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
        loadComplete: nav.loadEventEnd - nav.startTime,
        ttfb: nav.responseStart - nav.startTime,
        resources,
      }
    })
    .catch(() => null)
}

/** Auto-detect issues from collected step telemetry. */
const detectIssues = ({ telemetry }: { telemetry: Omit<StepTelemetry, 'issues'> }): Issue[] => {
  const issues: Issue[] = []

  // Console errors
  for (const log of telemetry.consoleLogs) {
    if (log.type === 'error') {
      // ERR_FAILED in dev mode = HMR resource abort or SPA navigation timing artifact
      // These only occur when the crawler navigates faster than real users would
      const isDevTimingError =
        log.text.includes('ERR_FAILED') ||
        (log.text.includes('Failed to fetch') && log.text.includes('betterFetch'))
      if (isDevTimingError) {
        issues.push({
          type: 'auth_timing',
          severity: 'low',
          description: `[CRAWLER-ARTIFACT] ${log.text.slice(0, 100)}`,
        })
        continue
      }

      // Filter out CORS/ERR_FAILED errors for auth endpoints (crawler timing artifacts)
      const isAuthTimingError =
        log.text.includes('/api/auth/') ||
        (log.text.includes('CORS') && log.text.includes('localhost:4000')) ||
        (log.text.includes('ERR_FAILED') && log.text.includes('localhost:4000'))
      if (isAuthTimingError) {
        issues.push({
          type: 'auth_timing',
          severity: 'low',
          description: `[CRAWLER-ARTIFACT] ${log.text.slice(0, 100)}`,
        })
        continue
      }
      issues.push({ type: 'console_error', severity: 'high', description: log.text })
    }
  }

  // Failed / error HTTP requests
  for (const req of telemetry.network) {
    if (req.isFailed || (req.status !== null && req.status >= 400)) {
      // Auth session timing failures are crawler artifacts, not app bugs
      if (req.url.includes('/api/auth/get-session') || req.url.includes('/api/auth/')) {
        issues.push({
          type: 'auth_timing',
          severity: 'low',
          description: `[CRAWLER-ARTIFACT] ${req.method} ${req.url} → ${req.status ?? 'FAILED'} (auth timing, not a real issue)`,
        })
        continue
      }
      const severity = req.status !== null && req.status >= 500 ? 'critical' : 'high'
      issues.push({
        type: 'failed_request',
        severity,
        description: `${req.method} ${req.url} → ${req.status ?? 'FAILED'}`,
      })
    }
  }

  // Slow requests > 1000 ms
  for (const req of telemetry.network) {
    if (req.durationMs > 1000) {
      issues.push({
        type: 'slow_request',
        severity: 'medium',
        description: `${req.method} ${req.url} took ${req.durationMs}ms`,
      })
    }
  }

  // Duplicate API calls (same URL+method within same step)
  const callCounts = new Map<string, number>()
  for (const req of telemetry.network) {
    if (req.resourceType === 'fetch' || req.resourceType === 'xhr') {
      const key = `${req.method} ${req.url}`
      callCounts.set(key, (callCounts.get(key) ?? 0) + 1)
    }
  }
  for (const [key, count] of callCounts) {
    if (count > 1) {
      issues.push({
        type: 'duplicate_call',
        severity: 'low',
        description: `${key} called ${count} times in this step`,
      })
    }
  }

  // Large JS bundles > 200 KB uncompressed
  for (const res of telemetry.performance?.resources ?? []) {
    if (res.type === 'script' && res.transferSize > 200_000) {
      issues.push({
        type: 'large_bundle',
        severity: 'medium',
        description: `Script ${res.name.split('/').pop()} is ${Math.round(res.transferSize / 1024)}KB`,
      })
    }
  }

  return issues
}

/** Attaches Playwright event listeners and provides step flush. */
class TelemetryCollector {
  private consoleLogs: ConsoleLog[] = []
  private networkMap = new Map<string, NetworkEvent>()
  private stepStartMs = 0

  /** Reset per-step buffers and record start time. */
  startStep() {
    this.consoleLogs = []
    this.networkMap = new Map()
    this.stepStartMs = Date.now()
  }

  /** Attach Playwright page listeners. Call once after page creation. */
  attach({ page }: { page: Page }) {
    page.on('console', (msg) => {
      // msg.stackTrace() removed in Playwright 1.44+; use msg.location() for the origin frame
      const stackFrames: StackFrame[] =
        msg.type() === 'error'
          ? (() => {
              const loc = msg.location()
              if (!loc?.url) {
                return []
              }
              return [
                {
                  url: loc.url,
                  lineNumber: loc.lineNumber,
                  columnNumber: loc.columnNumber,
                  origin:
                    loc.url.includes('localhost') || loc.url.includes('/src/')
                      ? ('app' as const)
                      : loc.url.startsWith('http')
                        ? ('vendor' as const)
                        : ('unknown' as const),
                },
              ]
            })()
          : []
      this.consoleLogs.push({
        type: msg.type() as ConsoleLog['type'],
        text: msg.text(),
        timestampMs: Date.now() - this.stepStartMs,
        stackFrames,
      })
    })

    // Uncaught JS exceptions — most informative for debugging
    page.on('pageerror', (err) => {
      const frames: StackFrame[] = (err.stack ?? '')
        .split('\n')
        .slice(1) // skip first line (message)
        .map((line) => {
          const match = /at .+ \((.+):(\d+):(\d+)\)/.exec(line) ?? /at (.+):(\d+):(\d+)/.exec(line)
          if (!match) {
            return null
          }
          const [, url, ln, col] = match
          return {
            url: url ?? '',
            lineNumber: parseInt(ln ?? '0', 10),
            columnNumber: parseInt(col ?? '0', 10),
            origin:
              (url ?? '').includes('localhost') || (url ?? '').includes('/src/')
                ? ('app' as const)
                : (url ?? '').startsWith('http')
                  ? ('vendor' as const)
                  : ('unknown' as const),
          }
        })
        .filter((f): f is StackFrame => f !== null)
      this.consoleLogs.push({
        type: 'error',
        text: `[UNCAUGHT] ${err.message}`,
        timestampMs: Date.now() - this.stepStartMs,
        stackFrames: frames,
      })
    })

    page.on('request', (req) => {
      const key = req.url() + req.method()
      const isApiCall = req.resourceType() === 'fetch' || req.resourceType() === 'xhr'
      const postBuf = isApiCall ? req.postDataBuffer() : null
      const requestBodyPreview = postBuf
        ? (() => {
            const raw = postBuf.toString('utf-8')
            if (raw.length > BODY_CAPTURE_LIMIT_BYTES) {
              return raw.slice(0, BODY_CAPTURE_LIMIT_BYTES) + ' [TRUNCATED]'
            }
            return raw
          })()
        : null
      this.networkMap.set(key, {
        id: key,
        url: req.url(),
        method: req.method(),
        resourceType: req.resourceType(),
        requestHeaders: Object.fromEntries(Object.entries(req.headers())),
        startTimestampMs: Date.now() - this.stepStartMs,
        status: null,
        isFailed: false,
        failureText: null,
        durationMs: 0,
        responseHeaders: {},
        requestBodySize: postBuf?.length ?? 0,
        responseBodySize: 0,
        requestBodyPreview,
        responseBodyPreview: null,
      })
    })

    page.on('response', (resp) => {
      const key = resp.url() + resp.request().method()
      const event = this.networkMap.get(key)
      if (!event) {
        return
      }
      event.status = resp.status()
      event.responseHeaders = Object.fromEntries(Object.entries(resp.headers()))
      event.durationMs = Date.now() - this.stepStartMs - event.startTimestampMs
      // Only capture body for fetch/xhr with JSON content-type
      const isApiCall = event.resourceType === 'fetch' || event.resourceType === 'xhr'
      const contentType = resp.headers()['content-type'] ?? ''
      const isJson = contentType.includes('application/json')
      if (isApiCall && isJson) {
        resp
          .body()
          .then((buf) => {
            event.responseBodySize = buf.length
            const raw = buf.toString('utf-8')
            event.responseBodyPreview =
              raw.length > BODY_CAPTURE_LIMIT_BYTES
                ? raw.slice(0, BODY_CAPTURE_LIMIT_BYTES) + ' [TRUNCATED]'
                : raw
          })
          .catch(() => null)
      } else if (isApiCall) {
        resp
          .body()
          .then((buf) => {
            event.responseBodySize = buf.length
          })
          .catch(() => null)
      }
    })

    page.on('requestfailed', (req) => {
      const key = req.url() + req.method()
      const event = this.networkMap.get(key)
      if (!event) {
        return
      }
      event.isFailed = true
      event.failureText = req.failure()?.errorText ?? null
      event.durationMs = Date.now() - this.stepStartMs - event.startTimestampMs
    })
  }

  /** Flush all collected telemetry for the current step. */
  async flushStep({ page, meta }: { page: Page; meta: StepMeta }): Promise<StepTelemetry> {
    const [storage, perf] = await Promise.all([
      captureStorage({ page }),
      capturePerformance({ page }),
    ])
    const partial: Omit<StepTelemetry, 'issues'> = {
      ...meta,
      consoleLogs: [...this.consoleLogs],
      network: Array.from(this.networkMap.values()),
      storage,
      performance: perf,
    }
    return { ...partial, issues: detectIssues({ telemetry: partial }) }
  }
}

// ---------------------------------------------------------------------------
// State / helpers
// ---------------------------------------------------------------------------

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

/**
 * Records a single crawl step: screenshot, a11y snapshot, and telemetry flush.
 * Returns both the legacy StepRecord (for backward compat) and the StepTelemetry.
 */
const recordStep = async ({
  page,
  flow,
  stepName,
  clickCount,
  steps,
  telemetrySteps,
  collector,
  auth,
  area,
  scenario,
  action,
  error,
}: {
  page: Page
  flow: string
  stepName: string
  clickCount: number
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  auth: StepAuth
  area: string
  scenario: string
  action: string
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

  // page.accessibility is deprecated in Playwright v1.44+; use ariaSnapshot instead
  await page
    .ariaSnapshot()
    .then((yaml) => {
      if (yaml) {
        fs.writeFileSync(a11yPath, yaml)
        a11yRelative = `screenshots/${a11yName}`
      }
    })
    .catch(() => null)

  const durationMs = Date.now() - start
  const pageTitle = await page.title().catch(() => '')

  const meta: StepMeta = {
    stepId: `${flow}-${slug}`,
    area,
    scenario,
    action,
    url: page.url(),
    pageTitle,
    auth,
    screenshotPath: screenshotRelative,
    durationMs,
  }

  const telemetry = await collector.flushStep({ page, meta })
  telemetrySteps.push(telemetry)

  const record: StepRecord = {
    flow,
    step_name: stepName,
    url: page.url(),
    click_count: clickCount,
    screenshot_path: screenshotRelative,
    a11y_tree_path: a11yRelative,
    duration_ms: durationMs,
    error: error ?? null,
  }

  steps.push(record)
  console.log(`[crawl] ${flow} / ${stepName} — ${error ? 'ERROR: ' + error : 'OK'}`)

  // Start next step's collection window immediately
  collector.startStep()

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
  // Allow 400ms for React to finish hydrating and tRPC queries to start
  await page.waitForTimeout(400)
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
  telemetrySteps,
  collector,
  state,
}: {
  page: Page
  context: BrowserContext
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  state: TestState
}): Promise<{ email: string; password: string; userId: string }> => {
  const email = `qa-${Date.now()}@taskforge-qa.test`
  const password = `QaPass_${Date.now()}!`
  let clickCount = 0
  const unauthAuth: StepAuth = { email: null, role: null, isImpersonating: false }

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
      telemetrySteps,
      collector,
      auth: unauthAuth,
      area: 'Authentication',
      scenario: 'User registration',
      action: 'Register via API',
      error: 'API registration failed',
    })
    throw new Error('[crawl] Registration API failed')
  }

  // Now visit the registration form for visual/UX crawl
  await page.goto(`${APP_URL}/auth/register`)
  await page.waitForLoadState('domcontentloaded')
  await recordStep({
    page,
    flow: 'auth',
    stepName: '01-register-form',
    clickCount,
    steps,
    telemetrySteps,
    collector,
    auth: unauthAuth,
    area: 'Authentication',
    scenario: 'User registration',
    action: 'View registration form',
  })

  // Navigate to projects to confirm session
  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page
    .getByRole('button', { name: /sign out/i })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })

  const userId = await getUserId({ request: context.request })
  const authCtx: StepAuth = { email, role: 'owner', isImpersonating: false }

  await recordStep({
    page,
    flow: 'auth',
    stepName: '02-register-success-projects',
    clickCount,
    steps,
    telemetrySteps,
    collector,
    auth: authCtx,
    area: 'Authentication',
    scenario: 'User registration',
    action: 'Land on /projects after registration',
  })

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

/** Flow: Login page visit — uses a fresh incognito context to avoid redirect issues. */
const flowLoginVisual = async ({
  browser,
  steps,
  telemetrySteps,
  collector,
  email,
}: {
  browser: Browser
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  email: string
}) => {
  // Use a clean context (no session cookies) so /auth/login renders without redirect
  const freshCtx = await browser.newContext()
  const page = freshCtx.newPage ? await freshCtx.newPage() : freshCtx.pages()[0]
  collector.attach({ page })
  const unauthAuth: StepAuth = { email: null, role: null, isImpersonating: false }
  await page.goto(`${APP_URL}/auth/login`)
  await page.waitForLoadState('domcontentloaded')
  await recordStep({
    page,
    flow: 'auth',
    stepName: '03-login-form-empty',
    steps,
    telemetrySteps,
    collector,
    auth: unauthAuth,
    area: 'Authentication',
    scenario: 'Login form',
    action: 'View empty login form',
    clickCount: 0,
  })

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
    telemetrySteps,
    collector,
    auth: unauthAuth,
    area: 'Authentication',
    scenario: 'Login — invalid credentials',
    action: 'Submit invalid credentials and observe error',
    clickCount: 1,
  })

  void email // referenced to track auth context switch later
  await freshCtx.close()
}

/** Flow: Projects list — empty state. */
const flowProjectsEmpty = async ({
  page,
  steps,
  telemetrySteps,
  collector,
  auth,
}: {
  page: Page
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  auth: StepAuth
}) => {
  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page
    .getByRole('button', { name: /sign out/i })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
  await recordStep({
    page,
    flow: 'projects',
    stepName: '01-projects-empty-state',
    steps,
    telemetrySteps,
    collector,
    auth,
    area: 'Projects',
    scenario: 'Empty projects list',
    action: 'View projects list with no projects',
    clickCount: 0,
  })
}

/** Flow: Create a project and record all steps. */
const flowCreateProject = async ({
  page,
  steps,
  telemetrySteps,
  collector,
  state,
  userId,
  auth,
}: {
  page: Page
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  state: TestState
  userId: string
  auth: StepAuth
}): Promise<string> => {
  const projectName = `QA Project ${Date.now()}`
  let clickCount = 0

  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page
    .getByRole('button', { name: /sign out/i })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })

  // Open dialog
  await openDialog({ page, buttonName: /new project/i })
  clickCount++
  await recordStep({
    page,
    flow: 'projects',
    stepName: '02-create-project-dialog',
    steps,
    telemetrySteps,
    collector,
    auth,
    area: 'Projects',
    scenario: 'Create project',
    action: 'Open new project dialog',
    clickCount,
  })

  // Fill form
  await page.getByRole('textbox').first().fill(projectName)
  await recordStep({
    page,
    flow: 'projects',
    stepName: '03-create-project-form-filled',
    steps,
    telemetrySteps,
    collector,
    auth,
    area: 'Projects',
    scenario: 'Create project',
    action: 'Fill project name in dialog',
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
    telemetrySteps,
    collector,
    auth,
    area: 'Projects',
    scenario: 'Create project',
    action: 'Submit create project form',
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
    telemetrySteps,
    collector,
    auth,
    area: 'Projects',
    scenario: 'Projects list',
    action: 'View projects list with created project',
    clickCount,
  })
  return href ?? '/projects'
}

/** Flow: Project detail — Tasks tab. */
const flowProjectDetailTasks = async ({
  page,
  steps,
  telemetrySteps,
  collector,
  projectHref,
  auth,
}: {
  page: Page
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  projectHref: string
  auth: StepAuth
}) => {
  await page.goto(projectHref)
  await page.getByRole('link', { name: /tasks/i }).waitFor({ state: 'visible', timeout: 15000 })
  await recordStep({
    page,
    flow: 'project-detail',
    stepName: '01-tasks-tab-empty',
    steps,
    telemetrySteps,
    collector,
    auth,
    area: 'Project Detail',
    scenario: 'Tasks tab',
    action: 'View project detail tasks tab (empty)',
    clickCount: 0,
  })
}

/** Flow: Create a task. */
const flowCreateTask = async ({
  page,
  steps,
  telemetrySteps,
  collector,
  state,
  projectId,
  projectHref,
  auth,
}: {
  page: Page
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  state: TestState
  projectId: string
  projectHref: string
  auth: StepAuth
}): Promise<void> => {
  let clickCount = 0

  await page.goto(projectHref)
  await page.getByRole('link', { name: /tasks/i }).waitFor({ state: 'visible', timeout: 15000 })

  // Open new task dialog
  await openDialog({ page, buttonName: /new task/i })
  clickCount++
  await recordStep({
    page,
    flow: 'tasks',
    stepName: '01-create-task-dialog',
    steps,
    telemetrySteps,
    collector,
    auth,
    area: 'Tasks',
    scenario: 'Create task',
    action: 'Open new task dialog',
    clickCount,
  })

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
    telemetrySteps,
    collector,
    auth,
    area: 'Tasks',
    scenario: 'Create task',
    action: 'Fill task title and description',
    clickCount,
  })

  // Submit
  await page.getByRole('button', { name: /^create$/i }).click()
  clickCount++
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 15000 })
  await page.getByText(taskTitle).waitFor({ state: 'visible', timeout: 10000 })
  await recordStep({
    page,
    flow: 'tasks',
    stepName: '03-task-created-in-list',
    steps,
    telemetrySteps,
    collector,
    auth,
    area: 'Tasks',
    scenario: 'Create task',
    action: 'Submit task form and verify in list',
    clickCount,
  })

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
const flowTaskStatusTransition = async ({
  page,
  steps,
  telemetrySteps,
  collector,
  auth,
}: {
  page: Page
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  auth: StepAuth
}) => {
  let clickCount = 0

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
      telemetrySteps,
      collector,
      auth,
      area: 'Tasks',
      scenario: 'Task status transition',
      action: 'Open task actions menu',
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
        telemetrySteps,
        collector,
        auth,
        area: 'Tasks',
        scenario: 'Task status transition',
        action: 'Set task status to in-progress',
        clickCount,
      })
    }
  } else {
    await recordStep({
      page,
      flow: 'tasks',
      stepName: '04-task-status-control-not-found',
      steps,
      telemetrySteps,
      collector,
      auth,
      area: 'Tasks',
      scenario: 'Task status transition',
      action: 'Look for task actions menu',
      clickCount,
      error: 'Status control not located — WARN',
    })
  }
}

/** Flow: Members tab. */
const flowMembersTab = async ({
  page,
  steps,
  telemetrySteps,
  collector,
  projectHref,
  auth,
}: {
  page: Page
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  projectHref: string
  auth: StepAuth
}) => {
  await page.goto(projectHref)
  await page.getByRole('link', { name: /tasks/i }).waitFor({ state: 'visible', timeout: 15000 })

  const membersLink = page.getByRole('link', { name: /members/i })
  await membersLink.click()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
  await recordStep({
    page,
    flow: 'members',
    stepName: '01-members-tab',
    steps,
    telemetrySteps,
    collector,
    auth,
    area: 'Members',
    scenario: 'Members tab',
    action: 'Navigate to project members tab',
    clickCount: 1,
  })
}

/** Flow: Settings tab. */
const flowSettingsTab = async ({
  page,
  steps,
  telemetrySteps,
  collector,
  projectHref,
  auth,
}: {
  page: Page
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  projectHref: string
  auth: StepAuth
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
    telemetrySteps,
    collector,
    auth,
    area: 'Project Settings',
    scenario: 'Settings tab',
    action: 'Navigate to project settings tab',
    clickCount: 1,
  })
}

/** Flow: Billing page. */
const flowBilling = async ({
  page,
  steps,
  telemetrySteps,
  collector,
  auth,
}: {
  page: Page
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  auth: StepAuth
}) => {
  await gotoHydrated({ page, url: `${APP_URL}/settings/billing` })
  await page.waitForTimeout(500)
  await recordStep({
    page,
    flow: 'billing',
    stepName: '01-billing-page',
    steps,
    telemetrySteps,
    collector,
    auth,
    area: 'Billing',
    scenario: 'Billing page',
    action: 'View billing page',
    clickCount: 0,
  })
}

/** Flow: Sidebar navigation links. */
const flowNavigation = async ({
  page,
  steps,
  telemetrySteps,
  collector,
  auth,
}: {
  page: Page
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  auth: StepAuth
}) => {
  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page
    .getByRole('button', { name: /sign out/i })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
  await recordStep({
    page,
    flow: 'navigation',
    stepName: '01-sidebar-projects-active',
    steps,
    telemetrySteps,
    collector,
    auth,
    area: 'Navigation',
    scenario: 'Sidebar navigation',
    action: 'View sidebar with Projects active',
    clickCount: 0,
  })

  const sidebar = page.locator('aside')
  await sidebar.getByRole('link', { name: /billing/i }).click()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
  await recordStep({
    page,
    flow: 'navigation',
    stepName: '02-sidebar-billing-link',
    steps,
    telemetrySteps,
    collector,
    auth,
    area: 'Navigation',
    scenario: 'Sidebar navigation',
    action: 'Click Billing in sidebar',
    clickCount: 1,
  })

  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page
    .getByRole('button', { name: /sign out/i })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
  await sidebar.getByRole('link', { name: /settings/i }).click()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(500)
  await recordStep({
    page,
    flow: 'navigation',
    stepName: '03-sidebar-settings-link',
    steps,
    telemetrySteps,
    collector,
    auth,
    area: 'Navigation',
    scenario: 'Sidebar navigation',
    action: 'Click Settings in sidebar',
    clickCount: 1,
  })
}

/** Flow: Sign out and verify unauthenticated state. */
const flowSignOut = async ({
  page,
  steps,
  telemetrySteps,
  collector,
  auth,
}: {
  page: Page
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  auth: StepAuth
}) => {
  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page
    .getByRole('button', { name: /sign out/i })
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })

  await page
    .getByRole('button', { name: /sign out/i })
    .first()
    .click()
  await page.waitForTimeout(1000)
  await recordStep({
    page,
    flow: 'auth',
    stepName: '05-signed-out',
    steps,
    telemetrySteps,
    collector,
    auth,
    area: 'Authentication',
    scenario: 'Sign out',
    action: 'Click sign out button',
    clickCount: 1,
  })

  const unauthAuth: StepAuth = { email: null, role: null, isImpersonating: false }
  await recordStep({
    page,
    flow: 'auth',
    stepName: '06-post-signout-page',
    steps,
    telemetrySteps,
    collector,
    auth: unauthAuth,
    area: 'Authentication',
    scenario: 'Sign out',
    action: 'Observe page after sign out',
    clickCount: 0,
  })
}

/** Flow: Login again with existing credentials (session replay). */
const flowLoginReturning = async ({
  page,
  context,
  steps,
  telemetrySteps,
  collector,
  email,
  password,
}: {
  page: Page
  context: BrowserContext
  steps: StepRecord[]
  telemetrySteps: StepTelemetry[]
  collector: TelemetryCollector
  email: string
  password: string
}) => {
  const unauthAuth: StepAuth = { email: null, role: null, isImpersonating: false }

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
      telemetrySteps,
      collector,
      auth: unauthAuth,
      area: 'Authentication',
      scenario: 'Login returning user',
      action: 'Sign in via API',
      clickCount: 0,
      error: 'API sign-in failed',
    })
    return
  }

  await page.goto(`${APP_URL}/auth/login`)
  await page.waitForLoadState('domcontentloaded')
  await recordStep({
    page,
    flow: 'auth',
    stepName: '07-login-returning-form',
    steps,
    telemetrySteps,
    collector,
    auth: unauthAuth,
    area: 'Authentication',
    scenario: 'Login returning user',
    action: 'View login form after API sign-in',
    clickCount: 0,
  })

  await gotoHydrated({ page, url: `${APP_URL}/projects` })
  await page.waitForTimeout(500)
  const returnedAuth: StepAuth = { email, role: 'owner', isImpersonating: false }
  await recordStep({
    page,
    flow: 'auth',
    stepName: '08-login-returning-success',
    steps,
    telemetrySteps,
    collector,
    auth: returnedAuth,
    area: 'Authentication',
    scenario: 'Login returning user',
    action: 'Land on /projects as returning user',
    clickCount: 0,
  })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/** Main crawl entry point. Runs all flows and writes the telemetry report. */
const main = async () => {
  ensureDirs()

  const state = loadState()
  const steps: StepRecord[] = []
  const telemetrySteps: StepTelemetry[] = []
  const startedAt = new Date().toISOString()

  console.log(`[crawl] Starting run ${runId}`)

  const collector = new TelemetryCollector()
  let browser: Browser | null = null

  try {
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({ baseURL: APP_URL })
    const page = await context.newPage()

    collector.attach({ page })
    collector.startStep()

    // --- Auth flows ---
    const { email, password, userId } = await flowRegistration({
      page,
      context,
      steps,
      telemetrySteps,
      collector,
      state,
    })

    const authCtx: StepAuth = { email, role: 'owner', isImpersonating: false }

    await flowLoginVisual({ browser: browser!, steps, telemetrySteps, collector, email })

    // Navigate back to app (restore session)
    await gotoHydrated({ page, url: `${APP_URL}/projects` })

    // Clean up any stale projects so we start fresh
    await cleanupProjects({ request: context.request })

    // --- Projects flows ---
    await flowProjectsEmpty({ page, steps, telemetrySteps, collector, auth: authCtx })
    const projectHref = await flowCreateProject({
      page,
      steps,
      telemetrySteps,
      collector,
      state,
      userId,
      auth: authCtx,
    })

    const projectId = state.projects.at(-1)?.id ?? ''

    // --- Tasks flows ---
    await flowProjectDetailTasks({
      page,
      steps,
      telemetrySteps,
      collector,
      projectHref,
      auth: authCtx,
    })
    await flowCreateTask({
      page,
      steps,
      telemetrySteps,
      collector,
      state,
      projectId,
      projectHref,
      auth: authCtx,
    })
    await flowTaskStatusTransition({ page, steps, telemetrySteps, collector, auth: authCtx })

    // --- Members flow ---
    await flowMembersTab({ page, steps, telemetrySteps, collector, projectHref, auth: authCtx })

    // --- Settings flow ---
    await flowSettingsTab({ page, steps, telemetrySteps, collector, projectHref, auth: authCtx })

    // --- Billing flow ---
    await flowBilling({ page, steps, telemetrySteps, collector, auth: authCtx })

    // --- Navigation flow ---
    await flowNavigation({ page, steps, telemetrySteps, collector, auth: authCtx })

    // --- Sign out ---
    await flowSignOut({ page, steps, telemetrySteps, collector, auth: authCtx })

    // --- Login again (fresh context) ---
    const freshContext = await browser.newContext({ baseURL: APP_URL })
    const freshPage = await freshContext.newPage()
    const freshCollector = new TelemetryCollector()
    freshCollector.attach({ page: freshPage })
    freshCollector.startStep()
    await flowLoginReturning({
      page: freshPage,
      context: freshContext,
      steps,
      telemetrySteps,
      collector: freshCollector,
      email,
      password,
    })
    await freshContext.close()

    await context.close()
  } finally {
    await browser?.close()
  }

  const finishedAt = new Date().toISOString()
  const errors = steps.filter((s) => s.error !== null).length
  const screenshots = steps.filter((s) => s.screenshot_path !== null).length
  const totalIssues = telemetrySteps.reduce((acc, s) => acc + s.issues.length, 0)

  // Write legacy crawl report (for analyze.ts compatibility)
  const legacyReport: LegacyCrawlReport = {
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
  const legacyReportPath = path.join(REPORTS_DIR, `crawl-${runTimestamp}.json`)
  fs.writeFileSync(legacyReportPath, JSON.stringify(legacyReport, null, 2))

  // Write new telemetry report
  const firstAccount = telemetrySteps.find((s) => s.auth.email !== null)
  const crawlReport: CrawlReport = {
    runId,
    testUser: {
      email: firstAccount?.auth.email ?? 'unknown',
      role: firstAccount?.auth.role ?? 'unknown',
    },
    startedAt,
    finishedAt,
    totalSteps: telemetrySteps.length,
    totalIssues,
    steps: telemetrySteps,
  }
  const telemetryReportPath = path.join(REPORTS_DIR, `telemetry-${runTimestamp}.json`)
  fs.writeFileSync(telemetryReportPath, JSON.stringify(crawlReport, null, 2))

  console.log(`[crawl] Done. ${steps.length} steps, ${errors} errors, ${screenshots} screenshots`)
  console.log(`[crawl] Issues detected: ${totalIssues}`)
  console.log(`[crawl] Legacy report:   ${legacyReportPath}`)
  console.log(`[crawl] Telemetry report: ${telemetryReportPath}`)
}

main().catch((err: unknown) => {
  console.error('[crawl] Fatal error:', err)
  process.exit(1)
})
