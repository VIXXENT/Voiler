// ---------------------------------------------------------------------------
// QA Crawler — Shared Types
// ---------------------------------------------------------------------------

/** A single stack frame from a console error or uncaught exception. */
export type StackFrame = {
  url: string
  lineNumber: number
  columnNumber: number
  /** Derived label: 'app' if url contains localhost/src, 'vendor' otherwise */
  origin: 'app' | 'vendor' | 'unknown'
}

/** A single console log entry captured during a step. */
export type ConsoleLog = {
  type: 'error' | 'warning' | 'info' | 'log' | 'debug'
  text: string
  timestampMs: number
  /** Available for 'error' type entries and uncaught page errors. */
  stackFrames: StackFrame[]
}

/** A single network request/response event captured during a step. */
export type NetworkEvent = {
  /** Unique key: url + method. */
  id: string
  url: string
  method: string
  /** Resource type: 'fetch', 'xhr', 'script', 'stylesheet', 'document', etc. */
  resourceType: string
  status: number | null
  requestHeaders: Record<string, string>
  responseHeaders: Record<string, string>
  requestBodySize: number
  responseBodySize: number
  /**
   * JSON body for fetch/xhr responses with content-type: application/json.
   * Capped at BODY_CAPTURE_LIMIT_BYTES. null if not captured or non-JSON.
   * If truncated, body ends with the sentinel string "[TRUNCATED]".
   */
  responseBodyPreview: string | null
  /** Same cap applies. null for non-JSON or GET requests with no body. */
  requestBodyPreview: string | null
  durationMs: number
  isFailed: boolean
  failureText: string | null
  startTimestampMs: number
}

/** Cookie entry with session-token redaction applied. */
export type CookieEntry = {
  name: string
  value: string
  domain: string
  path: string
  httpOnly: boolean
  secure: boolean
  sameSite: string | undefined
}

/** Snapshot of browser storage taken at end of a step. */
export type StorageSnapshot = {
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
  cookies: CookieEntry[]
}

/** A single resource entry from PerformanceResourceTiming. */
export type ResourceTiming = {
  name: string
  durationMs: number
  type: string
  transferSize: number
}

/** Navigation performance metrics captured after page load. */
export type PerformanceTelemetry = {
  domContentLoaded: number
  loadComplete: number
  ttfb: number
  resources: ResourceTiming[]
}

/** An auto-detected issue found during step analysis. */
export type Issue = {
  /**
   * Issue type. `auth_timing` covers all crawler timing artifacts — auth race, HMR abort,
   * or SPA navigation issue. Not a real app bug. Excluded from headline issue counts.
   */
  type:
    | 'console_error'
    | 'failed_request'
    | 'slow_request'
    | 'duplicate_call'
    | 'large_bundle'
    | 'auth_timing'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
}

/** Auth context tracked at the time of a step. */
export type StepAuth = {
  email: string | null
  role: string | null
  isImpersonating: boolean
}

/** Metadata passed into TelemetryCollector.flushStep. */
export type StepMeta = {
  stepId: string
  area: string
  scenario: string
  action: string
  url: string
  pageTitle: string
  auth: StepAuth
  screenshotPath: string | null
  durationMs: number
}

/** Full telemetry record for a single crawl step. */
export type StepTelemetry = StepMeta & {
  consoleLogs: ConsoleLog[]
  network: NetworkEvent[]
  storage: StorageSnapshot
  performance: PerformanceTelemetry | null
  issues: Issue[]
}

/** Top-level telemetry report written by crawl.ts. */
export type CrawlReport = {
  runId: string
  testUser: { email: string; role: string }
  startedAt: string
  finishedAt: string | null
  totalSteps: number
  totalIssues: number
  steps: StepTelemetry[]
}

// ---------------------------------------------------------------------------
// Test state types
// ---------------------------------------------------------------------------

export type TestAccount = {
  email: string
  password: string
  userId: string
  role: string
  notes: string
}

export type TestProject = {
  id: string
  name: string
  ownerId: string
  createdInRun: string
  notes: string
}

export type TestTask = {
  id: string
  title: string
  projectId: string
  status: string
  createdInRun: string
}

export type TestState = {
  accounts: TestAccount[]
  projects: TestProject[]
  tasks: TestTask[]
  lastUpdated: string | null
}

// ---------------------------------------------------------------------------
// Legacy types (kept for analyze.ts compatibility)
// ---------------------------------------------------------------------------

/** Legacy step record shape written by old crawl.ts (used by analyze.ts). */
export type StepRecord = {
  flow: string
  step_name: string
  url: string
  click_count: number
  screenshot_path: string | null
  a11y_tree_path: string | null
  duration_ms: number
  error: string | null
}

/** Legacy crawl report shape (used by analyze.ts). */
export type LegacyCrawlReport = {
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
