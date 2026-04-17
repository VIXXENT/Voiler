# QA Finding Schema

Each finding represents the result of testing one scenario from the functional specs.
Findings are written to JSON files named `findings-{timestamp}.json` by the analyzer script.

## JSON Structure

```json
{
  "id": "auth-001",
  "area": "Authentication",
  "scenario": "User registration happy path",
  "status": "OK",
  "severity": "critical",
  "spec_ref": "01-auth.md",
  "screenshots": [
    "screenshots/auth-01-register-form.png",
    "screenshots/auth-02-register-success.png"
  ],
  "click_count": 3,
  "expected_max_clicks": 3,
  "steps_taken": [
    "Navigate to /auth/register",
    "Fill name field with 'QA Test User'",
    "Fill email field",
    "Fill password field",
    "Fill confirm password field",
    "Click Register button",
    "Verify redirect to /projects"
  ],
  "expected_behavior": "User is redirected to /projects after successful registration",
  "actual_behavior": "User was redirected to /projects as expected",
  "ux_observations": [
    "Name field did not auto-focus on page load",
    "Password strength indicator would improve UX"
  ],
  "timestamp": "2026-04-15T10:00:00.000Z",
  "round": 1
}
```

## Field Reference

| Field                 | Type         | Description                                                                                                            |
| --------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `id`                  | string       | Unique finding ID: `{area}-{sequence}` (e.g. `auth-001`)                                                               |
| `area`                | string       | Functional area (Authentication, Projects, Tasks, Members, Billing, Navigation)                                        |
| `scenario`            | string       | Human-readable name of the scenario tested                                                                             |
| `status`              | enum         | `OK` — passed, `KO` — failed, `WARN` — passed with concerns, `SKIP` — not tested                                       |
| `severity`            | enum         | `critical` — blocks core use, `high` — major UX issue, `medium` — noticeable, `low` — minor, `info` — observation only |
| `spec_ref`            | string       | Filename of the spec this finding maps to                                                                              |
| `screenshots`         | string[]     | Relative paths to screenshots taken during this scenario                                                               |
| `click_count`         | number       | Actual number of clicks recorded during the flow                                                                       |
| `expected_max_clicks` | number       | Maximum clicks allowed per spec UX expectations                                                                        |
| `steps_taken`         | string[]     | Ordered list of actions performed, in plain language                                                                   |
| `expected_behavior`   | string       | What the spec says should happen (copied from spec)                                                                    |
| `actual_behavior`     | string       | What actually happened during the crawl                                                                                |
| `ux_observations`     | string[]     | Any UX notes — even for passing tests (friction, confusion, etc.)                                                      |
| `timestamp`           | string (ISO) | When this finding was recorded                                                                                         |
| `round`               | number       | Crawl run number (increments with each full crawl)                                                                     |

## Status Values

- **OK** — The scenario behaved exactly as specified. No issues found.
- **KO** — The scenario failed. A bug or missing feature was found.
- **WARN** — The scenario passed technically but something is off (UX issue, slow response,
  unexpected behavior that did not block the flow).
- **SKIP** — The scenario was not tested in this run (missing prerequisite, environment issue,
  or explicitly deferred).

## Severity Guidelines

Use severity to prioritize fixes:

| Severity   | When to use                                                                   |
| ---------- | ----------------------------------------------------------------------------- |
| `critical` | Core flow is broken (can't register, can't create project, etc.)              |
| `high`     | Feature works but key UX expectation is violated (e.g. 5 clicks instead of 2) |
| `medium`   | Non-blocking issue that degrades experience (missing label, unclear error)    |
| `low`      | Polish issue (spacing, color, copy)                                           |
| `info`     | Neutral observation, suggestion for improvement                               |
