# Plan D (Frontend) -- Final Code Review

**Reviewer:** Claude Opus 4.6 (Senior Code Reviewer)
**Branch:** `feat/plan-a-foundation`
**Commits reviewed:** `c84604f..8c8f928` (8 commits)
**Date:** 2026-04-02

---

## Positive Observations

1. **SSR-safe client initialization.** The mid-plan fix correctly uses `useState(() => ...)` lazy
   initializers for both `QueryClient` and tRPC client in `__root.tsx`, preventing cross-request
   leakage during SSR. This is textbook correct.

2. **Configurable API URL.** Both `lib/trpc.ts` and `lib/auth.ts` use
   `import.meta.env.VITE_API_URL ?? 'http://localhost:4000'` with proper `env.d.ts` typings.
   The mid-plan day-zero fix is verified correct.

3. **RoleGate handles loading state.** The `isPending` check was added and returns `fallback`
   or `null` while the session is loading. Verified correct.

4. **Consistent coding style.** No semicolons, arrow functions used throughout, JSDoc present on
   all exported functions, `eslint-disable` comments used judiciously for known tRPC/typedef
   inference gaps.

5. **Good component decomposition.** `AuthForm` with mode prop, reusable `RoleGate`, separate
   dev-menu tools -- clean separation of concerns.

6. **DevMenu role-gating.** Correctly gated behind `admin`/`dev` roles with keyboard shortcut,
   overlay, and accessibility attributes.

7. **IdDisplayToggle uses `useSyncExternalStore`.** Proper React 18 pattern for external store
   integration with SSR-safe `getServerSnapshot`.

8. **Route guards with `beforeLoad`.** Dashboard, sessions, and admin routes all check auth
   state before rendering. Admin route additionally checks `role === 'admin'`.

9. **Credential forwarding.** `fetchWithCredentials` wrapper in `lib/trpc.ts` ensures cookies
   are sent cross-origin for auth session management.

10. **i18n messages file.** `en.json` has a comprehensive set of keys matching the UI, ready for
    additional locales.

---

## Findings

### [day-zero] D-Z1: E2E auth tests navigate to wrong URLs

**Files:** `apps/web/e2e/auth.spec.ts` lines 4, 11, 23

The auth E2E tests navigate to `/login` and `/register`:

```ts
await page.goto('/login')
await page.goto('/register')
```

But the actual routes are `/auth/login` and `/auth/register` (confirmed in `routeTree.gen.ts`).
These tests will **always fail** because the pages will not contain the expected form elements --
TanStack Router will show a 404 or fallback.

**Fix:** Change all `goto('/login')` to `goto('/auth/login')` and `goto('/register')` to
`goto('/auth/register')`.

---

### [day-zero] D-Z2: Extensive use of `as` casting violates project mandate

**Files:** Multiple -- `UserList.tsx` (lines 26, 29), `admin/users.tsx` (lines 34, 37),
`settings/sessions.tsx` (lines 31, 33), `ImpersonationBanner.tsx` (lines 17-18),
`NavBar.tsx` (line 17), `RoleGate.tsx` (line 34), `LocaleSwitcher.tsx` (line 18),
`LogLevelToggle.tsx` (line 31), `i18n.tsx` (lines 25, 29)

CLAUDE.md states: **"Casting (`as any`, `as unknown`) is forbidden."** The codebase has ~15
non-generated-file `as` casts. While some arise from the cross-package tRPC type collision
(which is a known TODO), others are avoidable:

- **`session.data?.user?.role as string | undefined`** (NavBar, RoleGate, DevMenu) -- The
  Better Auth session type should be extended or a helper created to extract the role safely.
- **`data as UserRow[]`** (UserList, admin/users) -- These arise from the tRPC collision but
  should at minimum have a runtime guard or Zod parse.
- **`result.error as { message?: string }`** (sessions.tsx) -- Unsafe narrowing of an unknown
  error type.
- **`e.target.value as Locale`** (LocaleSwitcher) -- Could use a type guard function.
- **`JSON.parse(raw) as LogLevels`** (LogLevelToggle) -- Should validate with Zod or a
  runtime check since localStorage data is untrusted.
- **`en as Messages`** (i18n.tsx) -- The JSON import type could be asserted at the type level
  with `satisfies`.

**Fix:** Create a `sessionRole()` helper that returns `string | undefined` without casting.
For tRPC data, add Zod `.parse()` or runtime shape checks. For `JSON.parse`, validate with Zod.
For `en as Messages`, use `satisfies Messages` at the import or assignment level.

**Note:** The tRPC collision casts (`@ts-expect-error` + eslint-disable blocks) are
acknowledged as a known TODO and are not counted here.

---

### [day-zero] D-Z3: `@playwright/test` missing from `apps/web/package.json` devDependencies

**File:** `apps/web/package.json`

The `test:e2e` script calls `playwright test`, and `playwright.config.ts` imports from
`@playwright/test`, but the package is not listed in `devDependencies`. It is installed at the
root `package.json` level, which works with pnpm hoisting, but this is fragile:

- A `pnpm install --filter @voiler/web` would fail to resolve it.
- The `shamefully-hoist` or `public-hoist-pattern` settings could change.

**Fix:** Add `"@playwright/test": "^1.59.1"` to `apps/web/package.json` devDependencies.

---

### [important] D-I1: `let` used for mutable string interpolation in i18n

**File:** `apps/web/src/lib/i18n.tsx` line 60

```ts
let result: string = template
for (const entry of entries) {
  result = result.replace(`{${entry[0]}}`, entry[1])
}
```

CLAUDE.md mandates **"`const` over `let`, no object/array mutation."** This can be refactored
to use `Array.reduce()`:

```ts
const result: string = entries.reduce(
  (acc: string, entry: [string, string]) => acc.replace(`{${entry[0]}}`, entry[1]),
  template,
)
```

---

### [important] D-I2: `throw new Error` in `useTranslation` hook

**File:** `apps/web/src/lib/i18n.tsx` line 115

```ts
throw new Error('useTranslation must be used within' + ' I18nProvider')
```

CLAUDE.md states **"`throw`/`try-catch` forbidden for business logic."** While this is a
developer-facing invariant rather than business logic, it sets a bad precedent. Consider
returning a default/fallback context or using a compile-time enforcement pattern. At minimum,
document with a comment that this is an intentional invariant exception.

---

### [important] D-I3: `throw redirect()` in route guards uses `throw` pattern

**Files:** `routes/dashboard.tsx` (line 44), `routes/admin/users.tsx` (lines 143, 148),
`routes/settings/sessions.tsx` (line 207)

TanStack Router requires `throw redirect()` -- this is framework-mandated, not a project choice.
The `eslint-disable-next-line @typescript-eslint/only-throw-error` comments acknowledge this.
However, there is no project-level documentation explaining this exception to the "no throw" rule.

**Fix:** Add a brief comment block in one canonical location (e.g., `__root.tsx` or a
`CONVENTIONS.md`) explaining that `throw redirect()` is required by TanStack Router and is
exempt from the no-throw mandate.

---

### [important] D-I4: `loadSessions` not in `useEffect` dependency array

**File:** `apps/web/src/routes/settings/sessions.tsx` lines 25-39

```ts
const loadSessions: () => Promise<void> = async () => { ... }

useEffect(() => {
  void loadSessions()
}, [])
```

`loadSessions` is declared inside the component body but is not wrapped in `useCallback` and is
not listed in the `useEffect` dependency array. While the empty `[]` dep array is intentional
(load once on mount), React strict mode and the `react-hooks/exhaustive-deps` lint rule would
flag this. The function also closes over `setLoading`, `setError`, `setSessions` which are
stable, so it works in practice, but it should be wrapped in `useCallback` or moved inside the
effect for correctness.

**Fix:** Move the `loadSessions` body directly inside the `useEffect`, or wrap it in
`useCallback` and add it to the dependency array.

---

### [important] D-I5: i18n messages defined but not used in most components

**Files:** `AuthForm.tsx`, `UserList.tsx`, `ImpersonationBanner.tsx`,
`routes/settings/sessions.tsx`, `routes/admin/users.tsx`

These files all have hardcoded English strings despite `en.json` having the corresponding
translation keys. The `TODO: i18n` comments are present in `AuthForm.tsx`, `UserList.tsx`, and
`ImpersonationBanner.tsx`, but the sessions and admin pages have no such TODO markers.

**Fix:** Either complete the i18n integration in all components, or add `TODO: i18n` comments
to sessions.tsx and admin/users.tsx for tracking.

---

### [important] D-I6: `export default` used in config files

**Files:** `apps/web/vite.config.ts`, `apps/web/playwright.config.ts`

The project convention uses named exports (`export { Route }`, `export { trpc }`, etc.).
The config files use `export default defineConfig(...)`. While these are Vite/Playwright
conventions that expect default exports, worth noting for consistency.

**No fix required** -- framework config files are exempt from this convention.

---

### [note] D-N1: Duplicated user table component between `UserList.tsx` and `admin/users.tsx`

**Files:** `apps/web/src/components/UserList.tsx`, `apps/web/src/routes/admin/users.tsx`

Both files define nearly identical table markup, tRPC query patterns, and `UserRow`/
`AdminUserRow` interfaces. The admin page adds an "Actions" column but the base table
structure is copy-pasted.

**Suggestion:** Extract a shared `<UsersTable users={users} actions={...} />` component.

---

### [note] D-N2: `parseUserAgent` is brittle and incomplete

**File:** `apps/web/src/routes/settings/sessions.tsx` lines 76-93

The user agent parser uses simple `includes()` checks. Edge is Chromium-based and its UA
string contains "Chrome", so the order matters -- `Edge` check comes after `Chrome`, meaning
Edge will be displayed as "Chrome".

**Suggestion:** Reorder checks so `Edge` is checked before `Chrome`, or use a proper UA
parsing library.

---

### [note] D-N3: `DevMenu` renders outside `I18nProvider`

**File:** `apps/web/src/routes/__root.tsx` lines 42-43

```tsx
</I18nProvider>
...
<DevMenu />
```

The `DevMenu` component is rendered inside `trpc.Provider` but outside `I18nProvider`. If
`DevMenu` ever needs translation strings via `useTranslation()`, it will throw. Currently the
DevMenu uses only hardcoded English strings, so this is not a runtime issue yet.

**Suggestion:** Move `<DevMenu />` inside `<I18nProvider>` for future-proofing.

---

### [note] D-N4: No error boundary wrapping the route outlet

**File:** `apps/web/src/routes/__root.tsx`

There is no `ErrorBoundary` wrapping the `<Outlet />` or the root layout. If a child route
throws during render, the entire app will white-screen. TanStack Router supports
`errorComponent` on routes, but none are configured.

**Suggestion:** Add a root-level `errorComponent` to `createRootRoute` or wrap `<Outlet />`
in a React error boundary.

---

### [note] D-N5: `handleStop` in ImpersonationBanner uses `window.location.href`

**File:** `apps/web/src/components/ImpersonationBanner.tsx` line 34

```ts
window.location.href = '/admin/users'
```

This causes a full page reload rather than a client-side navigation. Similarly in
`admin/users.tsx` line 48: `window.location.href = '/dashboard'`. While this may be
intentional to fully reset auth state after impersonation changes, it should be documented.

**Suggestion:** Add a comment explaining that the full reload is intentional to clear
cached auth state.

---

### [note] D-N6: `LogLevelToggle` state mutation pattern

**File:** `apps/web/src/components/dev-menu/tools/LogLevelToggle.tsx` line 62-66

```ts
const next: LogLevels = {
  ...levels,
  [category]: !levels[category],
}
```

The `toggle` callback depends on `levels` in the closure. If called rapidly, it could use stale
state. The `useCallback` depends on `[levels]` so it re-creates on every state change, which is
fine but slightly wasteful. Consider using the `useState` updater form:
`setLevels((prev) => { const next = { ...prev, [category]: !prev[category] }; ... })`.

---

## Summary Table

| Severity  | Count  | IDs              |
| --------- | ------ | ---------------- |
| Day-zero  | 3      | D-Z1, D-Z2, D-Z3 |
| Important | 6      | D-I1 -- D-I6     |
| Note      | 6      | D-N1 -- D-N6     |
| **Total** | **15** |                  |

---

## Day-Zero Fixes Required Before Merge

1. **D-Z1:** Fix E2E test URLs from `/login` and `/register` to `/auth/login` and
   `/auth/register`.

2. **D-Z2:** Eliminate `as` casts in hand-written files. Create type-safe helpers for session
   role extraction, add Zod validation for `JSON.parse` of localStorage data, and use
   `satisfies` for the i18n messages import. The tRPC collision casts are exempted (known TODO).

3. **D-Z3:** Add `@playwright/test` to `apps/web/package.json` devDependencies.

---

## Mid-Plan Review Verification

The 3 day-zero issues from the mid-plan review (`8c8f928`) were all correctly fixed:

- Configurable API URL: **Verified correct.**
- RoleGate loading state: **Verified correct.**
- useState lazy init for clients: **Verified correct.**

The "important" and "note" issues from the mid-plan review that were deferred are still present
and are captured above (i18n incomplete usage, duplicated tables, etc.).

---

_Review generated by Claude Opus 4.6 (Senior Code Reviewer)_
