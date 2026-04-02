# Plan D Mid-Plan Code Review (Tasks D-1 through D-3)

**Branch:** `feat/plan-d-frontend`
**Reviewer:** Claude Opus 4.6 (automated)
**Date:** 2026-04-01
**Focus:** Day-zero issues -- security, crashes, broken functionality

---

## Positive Observations

- **No XSS vectors found.** No usage of `dangerouslySetInnerHTML` or
  unescaped HTML injection anywhere in the frontend code.
- **Server-side auth enforcement is solid.** The `user.list` and
  `user.getById` endpoints use `authedProcedure`, which rejects
  unauthenticated requests with a 401 at the tRPC middleware level.
  The client-side `beforeLoad` guard in `dashboard.tsx` is a UX
  convenience layer, not the sole line of defense.
- **CORS is properly configured** on the API with `credentials: true`,
  explicit origin allowlists, and CSRF protection middleware.
- **No secrets or environment variables** appear in any client-side
  code. The `auth.ts` and `trpc.ts` files reference only
  `localhost` URLs, not tokens or keys.
- **Error messages from infrastructure errors are sanitized**
  server-side (`user.ts:71` maps `InfrastructureError` to a
  generic message).
- **Code style** consistently follows project conventions
  (no semicolons, JSDoc, arrow functions, eslint-disable comments
  for known Zod/tRPC inference patterns).

---

## Findings

### [SEVERITY: day-zero] Hardcoded localhost URLs prevent deployment

**Files:**

- `apps/web/src/lib/trpc.ts:31` -- `url: 'http://localhost:4000/trpc'`
- `apps/web/src/lib/auth.ts:9` -- `baseURL: 'http://localhost:4000'`

Both the tRPC client and the Better Auth client have the API
base URL hardcoded to `http://localhost:4000`. In any non-local
environment (staging, production, Docker Compose with service
names), the frontend will fail to reach the API. This is a
day-zero crash for any deployment beyond `pnpm dev`.

**Recommendation:** Read the API URL from an environment variable
exposed via Vite (`import.meta.env.VITE_API_URL`) with
`http://localhost:4000` as the development default.

```ts
// lib/trpc.ts
const apiUrl: string = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
```

---

### [SEVERITY: day-zero] RoleGate renders content before session loads

**File:** `apps/web/src/components/RoleGate.tsx:32-43`

`authClient.useSession()` is asynchronous. On initial render,
`session.data` is `undefined` (loading state), which means
`userRole` is `undefined`. The `hasAccess` IIFE then falls
through to `return userRole === role` (line 43), which evaluates
to `false`, so children are hidden. This is functionally safe
(fails closed), but it causes a visible flash where gated
content disappears and reappears after the session loads.

More critically, there is **no loading state handling**. If the
session fetch is slow or fails, the component silently hides
children with no feedback to the user.

**Recommendation:** Check `session.isPending` and
`session.error` explicitly. Show the fallback or a spinner
while loading.

---

### [SEVERITY: day-zero] QueryClient created at module scope breaks SSR

**File:** `apps/web/src/routes/__root.tsx:9-12`

```ts
const queryClient = new QueryClient()
const trpcClient = createTrpcClient()
```

Both clients are instantiated at module scope (top level).
In an SSR context (TanStack Start), module-scope singletons
are shared across all requests on the server, causing
**cross-request data leakage** -- one user's cached query
results can bleed into another user's server-rendered page.

**Recommendation:** Move client creation inside a factory
function or use React context/lazy initialization so each
request gets its own instance. TanStack Start's `createRouter`
supports a `context` option for this purpose.

---

### [SEVERITY: important] user.create is a publicProcedure (open registration endpoint)

**File:** `apps/api/src/trpc/procedures/user.ts:89`

The `user.create` mutation uses `publicProcedure`, meaning
anyone can create user records via tRPC without authentication.
This is separate from Better Auth's `signUp` flow. If this
endpoint is intended only for admin use or internal tooling,
it should be `authedProcedure` or `adminProcedure`.

If it is intentionally public (e.g., for the registration
form), note that it bypasses Better Auth's password hashing
and session creation. The `AuthForm` component correctly uses
`authClient.signUp.email()`, not `trpc.user.create`, so this
endpoint appears unused by the frontend and could be an
unintended attack surface.

**Recommendation:** Either protect with `adminProcedure` or
remove if registration is handled exclusively via Better Auth.

---

### [SEVERITY: important] No redirect-away from auth pages when already logged in

**Files:**

- `apps/web/src/routes/auth/login.tsx`
- `apps/web/src/routes/auth/register.tsx`

Neither login nor register route has a `beforeLoad` guard that
redirects authenticated users to `/dashboard`. A logged-in user
can navigate to `/auth/login`, submit the form, and potentially
create a conflicting session or see confusing behavior.

**Recommendation:** Add a `beforeLoad` check mirroring the
dashboard pattern but inverted:

```ts
beforeLoad: async () => {
  const session = await authClient.getSession()
  if (session.data) {
    throw redirect({ to: '/dashboard' })
  }
}
```

---

### [SEVERITY: important] NavBar sign-out has no error handling or redirect

**File:** `apps/web/src/components/NavBar.tsx:33`

```ts
onClick={() => void authClient.signOut()}
```

The sign-out result is discarded (`void`). If `signOut()` fails
(network error, expired session), the user sees no feedback and
the UI may show stale authenticated state. After successful
sign-out, the user remains on whatever page they were on
(possibly the dashboard, which will then fail to load data).

**Recommendation:** Handle the result and navigate to `/` on
success, show an error toast on failure.

---

### [SEVERITY: important] UserList uses unsafe type cast for error

**File:** `apps/web/src/components/UserList.tsx:28`

```ts
;(error as { message: string }).message
```

This cast (`as`) violates the project mandate that casting is
forbidden. More practically, if `error` has a different shape,
accessing `.message` could return `undefined` silently, or
throw at runtime if `error` is a primitive.

**Recommendation:** Use a type guard or optional chaining:

```ts
const errorMessage: string | undefined = error instanceof Error ? error.message : 'Unknown error'
```

---

### [SEVERITY: note] Excessive eslint-disable comments reduce linting value

**Files:** All reviewed files

There are 30+ `eslint-disable` comments across 12 files,
primarily for `@typescript-eslint/typedef` and
`@typescript-eslint/no-unsafe-*`. While individually justified
by the cross-package tRPC type inference issue, the volume
erodes the value of the linting pipeline.

**Recommendation:** Track the cross-package tRPC type export
issue (noted as `TODO(plan-d)` in `trpc.ts:11`) as a
high-priority follow-up. Resolving it should eliminate the
majority of these suppressions. Consider a shared
`.eslintrc` override scoped to `apps/web/src/lib/trpc.ts`
instead of inline comments.

---

### [SEVERITY: note] Missing client-side input validation on AuthForm

**File:** `apps/web/src/components/AuthForm.tsx`

The form relies entirely on HTML5 `required` attributes and
`type="email"` for validation. There is no client-side password
strength check, minimum length enforcement, or name format
validation before submission. Server-side validation exists
(Zod schemas), but the user experience of getting a generic
server error for a weak password is poor.

**Recommendation:** Add Zod-based client-side validation
reusing the schemas from `@voiler/schema` for consistency.

---

### [SEVERITY: note] UserList exposes email addresses to all authenticated users

**File:** `apps/web/src/components/UserList.tsx:62`

The `user.list` endpoint returns `PublicUser` objects including
email addresses, visible to any authenticated user. Depending
on privacy requirements, this may be a data exposure concern.

**Recommendation:** Confirm this is intentional. If not,
consider a separate DTO that omits email for non-admin users,
or use `RoleGate` to conditionally hide the email column.

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| day-zero  | 3      |
| important | 4      |
| note      | 3      |
| **Total** | **10** |

### Day-zero fixes required before merging:

1. Make API URLs configurable via environment variable
2. Handle loading/error states in RoleGate
3. Move QueryClient/tRPC client out of module scope for SSR safety
