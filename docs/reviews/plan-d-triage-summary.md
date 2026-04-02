# Plan D Triage Summary

**Triager:** Claude Opus 4.6 (Pragmatic Tech Lead)
**Date:** 2026-04-02
**Branch:** `feat/plan-a-foundation` -> `main`

---

## 1. Fix Now (Before Merge)

### D-Z1: E2E auth tests navigate to wrong URLs

**What:** Change `/login` -> `/auth/login` and `/register` -> `/auth/register` in
`apps/web/e2e/auth.spec.ts`.

**Why it cannot wait:** Tests that always fail are worse than no tests. They train
developers to ignore test results and hide real regressions. This is a 30-second fix.

### D-Z3: `@playwright/test` missing from `apps/web/package.json`

**What:** Add `"@playwright/test": "^1.59.1"` to `apps/web/package.json` devDependencies.

**Why it cannot wait:** A boilerplate exists to be cloned and run. If someone runs
`pnpm install --filter @voiler/web` (a reasonable thing to do), E2E setup breaks. This
is a one-line fix with zero risk.

---

**Total fix-now items: 2**

---

## 2. Defer (Create GitHub Issues)

### D-Z2: `as` casting throughout frontend components

**Suggested title:** `refactor(web): eliminate as casts in favor of type-safe helpers`

**Why it can wait:** The reviewer correctly identified ~15 `as` casts, but the mandate
says "`as any` and `as unknown` are forbidden." Most of these are `as string`, `as Locale`,
`as UserRow[]` -- narrowing casts, not escape hatches. They do not introduce unsoundness
in practice. The session role casts are forced by Better Auth's types not exposing `role`.
The tRPC data casts are a known cross-package type collision. Fixing all of these properly
requires creating helper utilities, extending Better Auth types, and adding Zod runtime
validation -- real work that deserves its own focused PR, not a last-minute merge fix.
**Nothing is broken.** This is code quality, not functionality.

### D-I1: `let` used in i18n interpolation

**Suggested title:** `style(web): refactor i18n interpolation to use reduce instead of let`

**Why it can wait:** The code works correctly. This is a style preference. Zero runtime impact.

### D-I2: `throw new Error` in `useTranslation` hook

**Suggested title:** `refactor(web): replace throw in useTranslation with safe fallback`

**Why it can wait:** This is a React context invariant check -- the standard pattern used by
every hook library (React Query, React Router, etc.). It only fires during development if
you misuse the hook. Not business logic.

### D-I3: `throw redirect()` not documented as exception

**Suggested title:** `docs(web): document TanStack Router throw redirect() as no-throw exemption`

**Why it can wait:** The eslint-disable comments already explain this inline. A conventions
doc is nice but not blocking.

### D-I4: `loadSessions` not in useEffect dependency array

**Suggested title:** `fix(web): move loadSessions into useEffect or wrap in useCallback`

**Why it can wait:** Works correctly in practice. The function only closes over stable
setState refs. React strict mode will double-fire it (harmless for a fetch). Not a bug.

### D-I5: i18n messages defined but not wired into all components

**Suggested title:** `feat(web): complete i18n integration across all components`

**Why it can wait:** i18n integration is explicitly incomplete (TODO comments exist). This
is a known scope item for a future plan, not a regression.

### D-N1: Duplicated user table components

**Suggested title:** `refactor(web): extract shared UsersTable component`

**Why it can wait:** Duplication in a boilerplate is less harmful than premature abstraction.
When real features diverge the admin vs. user views, a shared component might be wrong.

### D-N2: `parseUserAgent` Edge vs Chrome ordering

**Suggested title:** `fix(web): reorder UA checks so Edge is detected before Chrome`

**Why it can wait:** Minor display bug in a dev-facing sessions page. Edge users see
"Chrome" -- annoying but not broken.

### D-N3: DevMenu outside I18nProvider

**Suggested title:** `fix(web): move DevMenu inside I18nProvider`

**Why it can wait:** DevMenu uses no translations today. Future-proofing, not a bug.

### D-N4: No error boundary on route outlet

**Suggested title:** `feat(web): add root-level errorComponent for route error handling`

**Why it can wait:** Good practice but not a boilerplate-breaking omission. White-screen on
unhandled errors is the React default everywhere.

### D-N5: `window.location.href` for navigation after impersonation

**Suggested title:** `docs(web): document intentional full-reload after impersonation stop`

**Why it can wait:** The full reload is almost certainly intentional to clear auth cache.
Needs a comment, not a code change.

### D-N6: LogLevelToggle stale closure risk

**Suggested title:** `fix(web): use setState updater form in LogLevelToggle toggle`

**Why it can wait:** Theoretical race condition on rapid clicking of debug log toggles in a
dev menu. Not a real-world issue.

### D-I6: `export default` in config files

**Not an issue.** The review itself says "No fix required." No GitHub issue needed.

---

## 3. Fix Script (Checklist)

```
[ ] 1. apps/web/e2e/auth.spec.ts
      - Replace goto('/login')    -> goto('/auth/login')
      - Replace goto('/register') -> goto('/auth/register')
      (Check all occurrences: lines 4, 11, 23)

[ ] 2. apps/web/package.json
      - Add to devDependencies:
        "@playwright/test": "^1.59.1"

[ ] 3. Verify
      - pnpm lint
      - pnpm typecheck
      - pnpm test
      - pnpm format:check
```

**Estimated time:** 5 minutes.

---

## Rationale

This is a boilerplate. Its job is to **work when cloned** and to **demonstrate good
patterns**. Two things are broken: tests that always fail (D-Z1) and a missing dependency
(D-Z3). Everything else works correctly and represents style/quality improvements that
belong in follow-up PRs.

The `as` casting issue (D-Z2) is the hardest call. I am deferring it because: (a) none of
the casts are `as any` or `as unknown` -- the literal text of the mandate, (b) fixing them
properly requires real architectural work (Better Auth type extension, Zod runtime
validation), and (c) shipping a working boilerplate today is more valuable than perfect
type safety next week. The GitHub issue should be high priority in the next sprint.

_Triage by Claude Opus 4.6 (Pragmatic Tech Lead)_
