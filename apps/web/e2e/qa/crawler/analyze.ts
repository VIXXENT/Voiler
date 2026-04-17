import fs from 'fs'
import path from 'path'

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

type Finding = {
  id: string
  area: string
  scenario: string
  status: 'OK' | 'KO' | 'WARN' | 'SKIP'
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  spec_ref: string
  screenshots: string[]
  click_count: number
  expected_max_clicks: number
  steps_taken: string[]
  expected_behavior: string
  actual_behavior: string
  ux_observations: string[]
  timestamp: string
  round: number
}

// ---------------------------------------------------------------------------
// Scenario definitions
// Each maps to a spec scenario and knows which crawl steps to look for.
// ---------------------------------------------------------------------------

type ScenarioTemplate = {
  id: string
  area: string
  scenario: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  spec_ref: string
  expected_max_clicks: number
  expected_behavior: string
  flow_prefix: string
  step_patterns: string[]
}

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'auth-001',
    area: 'Authentication',
    scenario: 'Registration: fresh user registers via API and lands on /projects',
    severity: 'critical',
    spec_ref: '01-auth.md',
    expected_max_clicks: 3,
    expected_behavior:
      'User registers and is redirected to /projects which loads with sidebar visible',
    flow_prefix: 'auth',
    step_patterns: ['register-form', 'register-success'],
  },
  {
    id: 'auth-002',
    area: 'Authentication',
    scenario: 'Login form renders with correct fields',
    severity: 'critical',
    spec_ref: '01-auth.md',
    expected_max_clicks: 0,
    expected_behavior: 'Login page shows email, password fields and a login button',
    flow_prefix: 'auth',
    step_patterns: ['login-form'],
  },
  {
    id: 'auth-003',
    area: 'Authentication',
    scenario: 'Invalid credentials — user stays on login page with error',
    severity: 'high',
    spec_ref: '01-auth.md',
    expected_max_clicks: 1,
    expected_behavior:
      'After submitting wrong credentials, user stays on /auth/login and error is visible',
    flow_prefix: 'auth',
    step_patterns: ['invalid-credentials'],
  },
  {
    id: 'auth-004',
    area: 'Authentication',
    scenario: 'Sign out — user is logged out and lands on public page',
    severity: 'critical',
    spec_ref: '01-auth.md',
    expected_max_clicks: 1,
    expected_behavior: 'Clicking Sign Out logs the user out and navigates to home or login page',
    flow_prefix: 'auth',
    step_patterns: ['signed-out', 'post-signout'],
  },
  {
    id: 'auth-005',
    area: 'Authentication',
    scenario: 'Login returning user — re-authentication works',
    severity: 'critical',
    spec_ref: '01-auth.md',
    expected_max_clicks: 2,
    expected_behavior: 'Returning user can log in and access /projects',
    flow_prefix: 'auth',
    step_patterns: ['login-returning'],
  },
  {
    id: 'projects-001',
    area: 'Projects',
    scenario: 'Projects list shows empty state for new user',
    severity: 'high',
    spec_ref: '02-projects.md',
    expected_max_clicks: 0,
    expected_behavior: 'Empty state message and New Project button visible, no error state',
    flow_prefix: 'projects',
    step_patterns: ['empty-state'],
  },
  {
    id: 'projects-002',
    area: 'Projects',
    scenario: 'Create project dialog opens and form submits successfully',
    severity: 'critical',
    spec_ref: '02-projects.md',
    expected_max_clicks: 2,
    expected_behavior: 'Dialog opens, name is filled, Create is clicked, project appears in list',
    flow_prefix: 'projects',
    step_patterns: ['create-project-dialog', 'create-project-form', 'create-project-success'],
  },
  {
    id: 'projects-003',
    area: 'Projects',
    scenario: 'Projects list shows created project with status badge',
    severity: 'high',
    spec_ref: '02-projects.md',
    expected_max_clicks: 0,
    expected_behavior: 'Project card is visible with name and Active status badge',
    flow_prefix: 'projects',
    step_patterns: ['projects-list-with-project'],
  },
  {
    id: 'tasks-001',
    area: 'Tasks',
    scenario: 'Project detail Tasks tab — empty state before any tasks',
    severity: 'medium',
    spec_ref: '03-project-detail.md',
    expected_max_clicks: 0,
    expected_behavior: 'Empty state is shown with New Task button visible',
    flow_prefix: 'project-detail',
    step_patterns: ['tasks-tab-empty'],
  },
  {
    id: 'tasks-002',
    area: 'Tasks',
    scenario: 'Create task dialog opens and task appears in list',
    severity: 'critical',
    spec_ref: '03-project-detail.md',
    expected_max_clicks: 2,
    expected_behavior: 'Task is created and appears in list with To Do status badge',
    flow_prefix: 'tasks',
    step_patterns: ['create-task-dialog', 'create-task-form', 'task-created'],
  },
  {
    id: 'tasks-003',
    area: 'Tasks',
    scenario: 'Task status transition from To Do to In Progress',
    severity: 'high',
    spec_ref: '03-project-detail.md',
    expected_max_clicks: 2,
    expected_behavior: 'Task status changes to In Progress after 2 clicks',
    flow_prefix: 'tasks',
    step_patterns: ['task-actions', 'task-status'],
  },
  {
    id: 'members-001',
    area: 'Members',
    scenario: 'Members tab shows Owner with badge',
    severity: 'medium',
    spec_ref: '04-members.md',
    expected_max_clicks: 1,
    expected_behavior: 'Members tab loads and shows the project owner with Owner badge',
    flow_prefix: 'members',
    step_patterns: ['members-tab'],
  },
  {
    id: 'project-settings-001',
    area: 'Project Settings',
    scenario: 'Settings tab loads without error',
    severity: 'medium',
    spec_ref: '03-project-detail.md',
    expected_max_clicks: 1,
    expected_behavior: 'Settings tab is accessible and renders content',
    flow_prefix: 'project-settings',
    step_patterns: ['settings-tab'],
  },
  {
    id: 'billing-001',
    area: 'Billing',
    scenario: 'Billing page shows current plan and upgrade option',
    severity: 'high',
    spec_ref: '05-billing.md',
    expected_max_clicks: 0,
    expected_behavior: 'Billing page shows Free plan with limits and Upgrade to Pro button',
    flow_prefix: 'billing',
    step_patterns: ['billing-page'],
  },
  {
    id: 'navigation-001',
    area: 'Navigation',
    scenario: 'Sidebar shows Projects, Billing, Settings links — all navigable',
    severity: 'high',
    spec_ref: '06-navigation.md',
    expected_max_clicks: 1,
    expected_behavior: 'All sidebar links navigate to correct pages without 404',
    flow_prefix: 'navigation',
    step_patterns: ['sidebar'],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find the most recent crawl report in the reports directory. */
const findLatestReport = ({ reportsDir }: { reportsDir: string }): string | null => {
  if (!fs.existsSync(reportsDir)) {
    return null
  }

  const files = fs
    .readdirSync(reportsDir)
    .filter((f) => f.startsWith('crawl-') && f.endsWith('.json'))
    .sort()
    .reverse()

  return files[0] ? path.join(reportsDir, files[0]) : null
}

/** Check if any step matching the patterns has an error. */
const hasError = ({ steps, patterns }: { steps: StepRecord[]; patterns: string[] }): boolean =>
  steps.some((s) => patterns.some((p) => s.step_name.includes(p)) && s.error !== null)

/** Collect screenshots from matching steps. */
const collectScreenshots = ({
  steps,
  patterns,
}: {
  steps: StepRecord[]
  patterns: string[]
}): string[] =>
  steps
    .filter((s) => patterns.some((p) => s.step_name.includes(p)))
    .map((s) => s.screenshot_path)
    .filter((p): p is string => p !== null)

/** Get max click count from matching steps. */
const maxClickCount = ({
  steps,
  patterns,
}: {
  steps: StepRecord[]
  patterns: string[]
}): number => {
  const matching = steps.filter((s) => patterns.some((p) => s.step_name.includes(p)))
  return matching.length > 0 ? Math.max(...matching.map((s) => s.click_count)) : 0
}

/** Describe steps taken in matching flow. */
const describeSteps = ({
  steps,
  patterns,
}: {
  steps: StepRecord[]
  patterns: string[]
}): string[] =>
  steps
    .filter((s) => patterns.some((p) => s.step_name.includes(p)))
    .map(
      (s) => `Navigate to ${s.url} [step: ${s.step_name}]${s.error ? ` — ERROR: ${s.error}` : ''}`,
    )

/** Determine finding status from steps. */
const determineStatus = ({
  steps,
  patterns,
  clickCount,
  expectedMaxClicks,
}: {
  steps: StepRecord[]
  patterns: string[]
  clickCount: number
  expectedMaxClicks: number
}): Finding['status'] => {
  const matchingSteps = steps.filter((s) => patterns.some((p) => s.step_name.includes(p)))

  if (matchingSteps.length === 0) {
    return 'SKIP'
  }

  if (hasError({ steps, patterns })) {
    return 'KO'
  }

  if (expectedMaxClicks > 0 && clickCount > expectedMaxClicks) {
    return 'WARN'
  }

  return 'OK'
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/** Reads the latest crawl report and outputs a pre-populated findings template. */
const main = () => {
  const qaDir = path.resolve(import.meta.dirname, '..')
  const reportsDir = path.join(qaDir, 'reports')
  const findingsDir = path.join(qaDir, 'findings')

  const reportPath = findLatestReport({ reportsDir })

  if (!reportPath) {
    console.error('[analyze] No crawl report found. Run qa:crawl first.')
    process.exit(1)
  }

  console.log(`[analyze] Reading report: ${reportPath}`)

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8')) as CrawlReport
  const { steps } = report
  const now = new Date().toISOString()

  const findings: Finding[] = SCENARIO_TEMPLATES.map((template, index) => {
    const matchPatterns = template.step_patterns
    const clicks = maxClickCount({ steps, patterns: matchPatterns })
    const status = determineStatus({
      steps,
      patterns: matchPatterns,
      clickCount: clicks,
      expectedMaxClicks: template.expected_max_clicks,
    })

    const matchingSteps = steps.filter((s) => matchPatterns.some((p) => s.step_name.includes(p)))
    const errorMessages = matchingSteps
      .filter((s) => s.error !== null)
      .map((s) => s.error as string)

    return {
      id: template.id,
      area: template.area,
      scenario: template.scenario,
      status,
      severity: template.severity,
      spec_ref: template.spec_ref,
      screenshots: collectScreenshots({ steps, patterns: matchPatterns }),
      click_count: clicks,
      expected_max_clicks: template.expected_max_clicks,
      steps_taken: describeSteps({ steps, patterns: matchPatterns }),
      expected_behavior: template.expected_behavior,
      actual_behavior:
        status === 'SKIP'
          ? 'Scenario was not executed in this crawl run'
          : status === 'KO'
            ? `FAILED — ${errorMessages.join('; ')}`
            : `Steps completed successfully (${matchingSteps.length} step(s) recorded)`,
      ux_observations:
        status === 'WARN'
          ? [`Click count (${clicks}) exceeded expected maximum (${template.expected_max_clicks})`]
          : [],
      timestamp: now,
      round: index + 1,
    }
  })

  // Summary
  const okCount = findings.filter((f) => f.status === 'OK').length
  const koCount = findings.filter((f) => f.status === 'KO').length
  const warnCount = findings.filter((f) => f.status === 'WARN').length
  const skipCount = findings.filter((f) => f.status === 'SKIP').length

  console.log(
    `[analyze] Findings: ${okCount} OK, ${koCount} KO, ${warnCount} WARN, ${skipCount} SKIP`,
  )

  // Write output
  const timestamp = now.replace(/[:.]/g, '-')
  const outputPath = path.join(findingsDir, `findings-${timestamp}.json`)

  if (!fs.existsSync(findingsDir)) {
    fs.mkdirSync(findingsDir, { recursive: true })
  }

  fs.writeFileSync(outputPath, JSON.stringify(findings, null, 2))
  console.log(`[analyze] Findings written to: ${outputPath}`)

  // Print KO/WARN to console for quick review
  const issues = findings.filter((f) => f.status === 'KO' || f.status === 'WARN')
  if (issues.length > 0) {
    console.log('\n--- Issues ---')
    for (const issue of issues) {
      console.log(`[${issue.status}] ${issue.id} — ${issue.scenario}`)
      console.log(`  ${issue.actual_behavior}`)
    }
  }
}

main()
