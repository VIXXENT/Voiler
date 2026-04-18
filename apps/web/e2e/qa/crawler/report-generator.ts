import fs from 'fs'
import path from 'path'
import type { CrawlReport, Issue, StepTelemetry } from './types.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QA_DIR = path.resolve(import.meta.dirname, '..')
const REPORTS_DIR = path.join(QA_DIR, 'reports')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find the most recent telemetry-*.json report. */
const findLatestTelemetry = ({ reportsDir }: { reportsDir: string }): string | null => {
  if (!fs.existsSync(reportsDir)) {
    return null
  }
  const files = fs
    .readdirSync(reportsDir)
    .filter((f) => f.startsWith('telemetry-') && f.endsWith('.json'))
    .sort()
    .reverse()
  return files[0] ? path.join(reportsDir, files[0]) : null
}

/** Format milliseconds as human-readable duration. */
const formatDuration = ({ ms }: { ms: number }): string => {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) {
    return `${seconds}s`
  }
  return `${minutes}m ${seconds}s`
}

/** Count issues by severity. */
const countBySeverity = ({
  issues,
  severity,
}: {
  issues: Issue[]
  severity: Issue['severity']
}): number => issues.filter((i) => i.severity === severity).length

/** Most common issue type in a severity group. */
const mostCommonType = ({
  issues,
  severity,
}: {
  issues: Issue[]
  severity: Issue['severity']
}): string => {
  const filtered = issues.filter((i) => i.severity === severity)
  if (filtered.length === 0) {
    return '—'
  }
  const counts = new Map<string, number>()
  for (const issue of filtered) {
    counts.set(issue.type, (counts.get(issue.type) ?? 0) + 1)
  }
  let topType = ''
  let topCount = 0
  for (const [type, count] of counts) {
    if (count > topCount) {
      topType = type
      topCount = count
    }
  }
  return topType
}

/** Severity badge emoji. */
const severityBadge = ({ severity }: { severity: Issue['severity'] }): string => {
  const badges: Record<Issue['severity'], string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🔵',
  }
  return badges[severity]
}

/** Render the console section for one step, including stack frames for errors. */
const renderConsoleSection = ({ step }: { step: StepTelemetry }): string => {
  if (step.consoleLogs.length === 0) {
    return '*(no console output)*\n'
  }
  const lines = step.consoleLogs
    .map((l) => {
      const badge = `\`[${l.type.toUpperCase()}]\``
      const base = `- ${badge} ${l.text}`
      if (l.stackFrames.length === 0) {
        return base
      }
      const frames = l.stackFrames
        .map((f) => {
          const origin = f.origin === 'app' ? '🔴 app' : f.origin === 'vendor' ? '⚪ vendor' : '❓'
          return `  - ${origin} \`${f.url}:${f.lineNumber}:${f.columnNumber}\``
        })
        .join('\n')
      return `${base}\n${frames}`
    })
    .join('\n')
  return lines + '\n'
}

/** Render the network table for one step. */
const renderNetworkSection = ({ step }: { step: StepTelemetry }): string => {
  if (step.network.length === 0) {
    return '*(no network activity)*\n'
  }
  const header = `| # | Method | Endpoint | Status | Duration | Body |\n|---|--------|----------|--------|----------|------|\n`
  const rows = step.network
    .map((req, i) => {
      const endpoint = req.url.replace(/^https?:\/\/[^/]+/, '')
      const status = req.isFailed ? '**FAILED**' : (req.status?.toString() ?? '—')
      const duration = req.durationMs > 0 ? `${req.durationMs}ms` : '—'
      const bodySize =
        req.responseBodySize > 0 ? `${Math.round((req.responseBodySize / 1024) * 10) / 10}KB` : '—'
      return `| ${i + 1} | ${req.method} | ${endpoint} | ${status} | ${duration} | ${bodySize} |`
    })
    .join('\n')
  // Append body previews for API calls that have them
  const previews = step.network
    .filter((req) => req.responseBodyPreview !== null || req.requestBodyPreview !== null)
    .map((req, i) => {
      const endpoint = req.url.replace(/^https?:\/\/[^/]+/, '')
      const parts: string[] = [`\n**Call ${i + 1} body preview** — \`${req.method} ${endpoint}\``]
      if (req.requestBodyPreview) {
        parts.push(`*Request:*\n\`\`\`json\n${req.requestBodyPreview}\n\`\`\``)
      }
      if (req.responseBodyPreview) {
        parts.push(`*Response:*\n\`\`\`json\n${req.responseBodyPreview}\n\`\`\``)
      }
      return parts.join('\n')
    })
    .join('\n')
  return `**${step.network.length} calls**\n\n${header}${rows}\n${previews}\n`
}

/** Render the storage section for one step. */
const renderStorageSection = ({ step }: { step: StepTelemetry }): string => {
  const lsKeys = Object.keys(step.storage.localStorage)
  const ssKeys = Object.keys(step.storage.sessionStorage)
  const cookieCount = step.storage.cookies.length
  const ls = lsKeys.length === 0 ? '*(empty)*' : lsKeys.map((k) => `\`${k}\``).join(', ')
  const ss = ssKeys.length === 0 ? '*(empty)*' : ssKeys.map((k) => `\`${k}\``).join(', ')
  const cookies = cookieCount === 0 ? '*(none)*' : `${cookieCount} cookie(s)`
  return `- localStorage: ${ls}\n- sessionStorage: ${ss}\n- Cookies: ${cookies}\n`
}

/** Render the performance section for one step. */
const renderPerfSection = ({ step }: { step: StepTelemetry }): string => {
  if (!step.performance) {
    return '*(no performance data)*\n'
  }
  const perf = step.performance
  const largest = perf.resources
    .filter((r) => r.type === 'script')
    .sort((a, b) => b.transferSize - a.transferSize)[0]
  const largestInfo = largest
    ? `\n- Largest script: \`${largest.name.split('/').pop()}\` (${Math.round(largest.transferSize / 1024)}KB)`
    : ''
  return (
    `- TTFB: ${Math.round(perf.ttfb)}ms | ` +
    `DOMContentLoaded: ${Math.round(perf.domContentLoaded)}ms | ` +
    `Load: ${Math.round(perf.loadComplete)}ms` +
    largestInfo +
    '\n'
  )
}

/** Render the issues section for one step. */
const renderIssuesSection = ({ step }: { step: StepTelemetry }): string => {
  if (step.issues.length === 0) {
    return '**No issues detected**\n'
  }
  const lines = step.issues
    .map(
      (issue) =>
        `- ${severityBadge({ severity: issue.severity })} **[${issue.severity.toUpperCase()}]** \`${issue.type}\`: ${issue.description}`,
    )
    .join('\n')
  return lines + '\n'
}

// ---------------------------------------------------------------------------
// Markdown report generator
// ---------------------------------------------------------------------------

/** Generate the full markdown report string from a CrawlReport. */
const generateMarkdown = ({ report }: { report: CrawlReport }): string => {
  const allIssues = report.steps.flatMap((s) => s.issues)
  const criticalCount = countBySeverity({ issues: allIssues, severity: 'critical' })
  const highCount = countBySeverity({ issues: allIssues, severity: 'high' })
  const mediumCount = countBySeverity({ issues: allIssues, severity: 'medium' })
  const lowCount = countBySeverity({ issues: allIssues, severity: 'low' })

  const startMs = new Date(report.startedAt).getTime()
  const endMs = report.finishedAt ? new Date(report.finishedAt).getTime() : Date.now()
  const duration = formatDuration({ ms: endMs - startMs })

  const issueSummaryLine = [
    criticalCount > 0 ? `${criticalCount} critical` : null,
    highCount > 0 ? `${highCount} high` : null,
    mediumCount > 0 ? `${mediumCount} medium` : null,
    lowCount > 0 ? `${lowCount} low` : null,
  ]
    .filter(Boolean)
    .join(', ')

  const lines: string[] = [
    '# TaskForge QA Telemetry Report',
    '',
    `**Run:** ${report.runId}  `,
    `**Test User:** ${report.testUser.email} (role: ${report.testUser.role})  `,
    `**Duration:** ${duration}  `,
    `**Steps:** ${report.totalSteps} | **Issues:** ${report.totalIssues}${issueSummaryLine ? ` (${issueSummaryLine})` : ''}`,
    '',
    '---',
    '',
    '## Issue Summary',
    '',
    '| Severity | Count | Most Common Type |',
    '|----------|-------|-----------------|',
    `| ${severityBadge({ severity: 'critical' })} Critical | ${criticalCount} | ${mostCommonType({ issues: allIssues, severity: 'critical' })} |`,
    `| ${severityBadge({ severity: 'high' })} High | ${highCount} | ${mostCommonType({ issues: allIssues, severity: 'high' })} |`,
    `| ${severityBadge({ severity: 'medium' })} Medium | ${mediumCount} | ${mostCommonType({ issues: allIssues, severity: 'medium' })} |`,
    `| ${severityBadge({ severity: 'low' })} Low | ${lowCount} | ${mostCommonType({ issues: allIssues, severity: 'low' })} |`,
    '',
    '---',
    '',
  ]

  // Issues found section (only steps with issues)
  const stepsWithIssues = report.steps.filter((s) => s.issues.length > 0)
  if (stepsWithIssues.length > 0) {
    lines.push('## Issues Found', '')
    for (const step of stepsWithIssues) {
      for (const issue of step.issues) {
        lines.push(
          `### ${severityBadge({ severity: issue.severity })} [${issue.severity.toUpperCase()}] ${issue.type.replace(/_/g, ' ')} — ${issue.description}`,
          `**Step:** ${step.stepId}  `,
          `**Page:** ${step.url}  `,
          `**Action:** ${step.action}  `,
          `**User:** ${step.auth.email ?? 'unauthenticated'} (${step.auth.role ?? 'none'} role)  `,
          '',
        )
      }
    }
    lines.push('---', '')
  }

  // Step-by-step telemetry
  lines.push('## Step-by-Step Telemetry', '')

  for (const step of report.steps) {
    const authLabel =
      step.auth.email !== null
        ? `${step.auth.email} (${step.auth.role ?? 'unknown'} role)`
        : 'Unauthenticated'

    lines.push(
      `### ${step.stepId}`,
      `**Area:** ${step.area} | **Scenario:** ${step.scenario}  `,
      `**URL:** ${step.url}  `,
      `**Auth:** ${authLabel}  `,
      `**Duration:** ${step.durationMs}ms  `,
      '',
      '#### Console',
      '',
      renderConsoleSection({ step }),
      '#### Network',
      '',
      renderNetworkSection({ step }),
      '#### Storage',
      '',
      renderStorageSection({ step }),
      '#### Performance',
      '',
      renderPerfSection({ step }),
      '#### Issues',
      '',
      renderIssuesSection({ step }),
      '---',
      '',
    )
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// CSV issues generator
// ---------------------------------------------------------------------------

/** Generate CSV content for all issues across all steps. */
const generateIssuesCsv = ({ report }: { report: CrawlReport }): string => {
  const header = 'severity,type,step_id,area,url,description,timestamp'
  const rows: string[] = [header]

  for (const step of report.steps) {
    for (const issue of step.issues) {
      const description = `"${issue.description.replace(/"/g, '""')}"`
      rows.push(
        [
          issue.severity,
          issue.type,
          step.stepId,
          step.area,
          step.url,
          description,
          report.startedAt,
        ].join(','),
      )
    }
  }

  return rows.join('\n') + '\n'
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/** Reads the latest telemetry report and generates a markdown report + CSV. */
const main = () => {
  const reportPath = findLatestTelemetry({ reportsDir: REPORTS_DIR })

  if (!reportPath) {
    console.error('[report] No telemetry report found. Run qa:crawl first.')
    process.exit(1)
  }

  console.log(`[report] Reading telemetry: ${reportPath}`)

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8')) as CrawlReport

  const timestamp = report.startedAt.replace(/[:.]/g, '-')

  // Markdown report
  const markdown = generateMarkdown({ report })
  const mdPath = path.join(REPORTS_DIR, `report-${timestamp}.md`)
  fs.writeFileSync(mdPath, markdown)
  console.log(`[report] Markdown report: ${mdPath}`)

  // CSV issues
  const csv = generateIssuesCsv({ report })
  const csvPath = path.join(REPORTS_DIR, `issues-${timestamp}.csv`)
  fs.writeFileSync(csvPath, csv)
  console.log(`[report] Issues CSV:      ${csvPath}`)

  const allIssues = report.steps.flatMap((s) => s.issues)
  console.log(
    `[report] Summary: ${report.totalSteps} steps, ${allIssues.length} issues` +
      ` (${countBySeverity({ issues: allIssues, severity: 'critical' })} critical,` +
      ` ${countBySeverity({ issues: allIssues, severity: 'high' })} high,` +
      ` ${countBySeverity({ issues: allIssues, severity: 'medium' })} medium,` +
      ` ${countBySeverity({ issues: allIssues, severity: 'low' })} low)`,
  )
}

main()
