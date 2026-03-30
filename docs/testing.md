# Testing

## Overview

| Type | Tool | Status | Location |
|------|------|--------|----------|
| E2E | Playwright | Active (11 tests) | `apps/web/e2e/` |
| Unit | Vitest | Planned | `**/*.spec.ts` |

## E2E Tests (Playwright)

### Configuration

`apps/web/playwright.config.ts` — key settings:

```ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

### Running E2E Tests

> **Important:** The dev server must be running before executing E2E tests.
> There is no `webServer` auto-start config yet (tracked in Issue #38).

```sh
# Terminal 1 — start the full stack
npm run dev

# Terminal 2 — run E2E suite
npm run test:e2e
```

Or run a single file:
```sh
npx playwright test apps/web/e2e/auth.spec.ts
```

### Test Structure

```
apps/web/e2e/
├── smoke.spec.ts   — Basic connectivity: homepage loads, API responds
└── auth.spec.ts    — Auth flows: sign-in, sign-out, protected routes, error states
```

Tests use `test.describe.serial()` for auth flows to avoid session state conflicts.

### Conventions

- File naming: `*.spec.ts` inside `e2e/` folder.
- Use `page.getByRole()` and `page.getByLabel()` over CSS selectors.
- Assertions via `expect(page)` from `@playwright/test`.
- Screenshots on failure are stored in `apps/web/test-results/`.

### CI Behavior

- `forbidOnly: true` — `test.only` causes CI to fail (prevents accidental focus runs).
- `retries: 2` — flaky network tests get two retries in CI.
- `workers: 1` — serialized in CI to avoid port conflicts.
- Reporter: `github` format for annotations in GitHub Actions.

## Unit Tests (Vitest)

Vitest is installed at the workspace root but unit tests are **planned** (not yet written).

When added:
- Location: co-located with source, `**/*.spec.ts` pattern.
- Run: `npx vitest run` from project root.
- Use-cases and domain value-objects are the primary targets.

## Test Data

- E2E tests create their own test users via the sign-up flow.
- The test database uses `file::memory:` (in-memory SQLite) — see `TestEnvSchema` in
  `packages/config-env/src/schema.ts`.
