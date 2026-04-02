# Plan C (Better Auth) -- Final Code Review

**Branch:** `feat/plan-c-auth`
**Reviewer:** Claude Opus 4.6 (1M context)
**Date:** 2026-04-01
**Commits reviewed:** 8 (1da052b..e3934f4)

---

## Executive Summary

Plan C delivers a solid Better Auth integration with Drizzle adapter,
tRPC guard middleware (authed/admin/dev), optional OAuth, session
management, and admin impersonation with audit trails. Typecheck
passes clean, all 35 tests pass. The architecture follows hexagonal
principles well, with the container as the sole adapter wiring point.

There are **4 day-zero findings** that must be fixed before merge,
**5 important findings** that should be addressed promptly, and
**6 notes** for improvement.

---

## Day-Zero Findings (must fix before merge)

### [SEVERITY: day-zero] D1 -- Unhandled Promise rejections in session/admin procedures

**File:** `apps/api/src/trpc/procedures/session.ts:57,65,81,89`
**File:** `apps/api/src/trpc/procedures/admin.ts:49,71`

**Issue:** All Better Auth API calls (`listSessions`, `revokeSession`,
`revokeOtherSessions`, `revokeSessions`, `impersonateUser`,
`stopImpersonating`) are bare `await` calls with no error handling.
If Better Auth throws (network issue, expired session, DB failure),
the raw error propagates as an unhandled rejection. This:

1. Leaks internal error details to clients (violates security
   hardening plan for error sanitization).
2. Violates the project mandate: `throw`/`try-catch` is forbidden for
   business logic -- but these are effectively doing unguarded throws.
3. Contrasts with the user procedures which properly use
   `ResultAsync` + `.match()` + `throwTrpcError()`.

**Fix:** Wrap each Better Auth API call in `ResultAsync.fromPromise()`
and handle errors through the established `throwTrpcError` pattern,
or at minimum wrap with a utility that catches and returns a
sanitized `TRPCError` with `INTERNAL_SERVER_ERROR`. Example:

```typescript
const sessions: SessionRecord[] = await ResultAsync.fromPromise(
  listSessions({ headers: opts.ctx.headers }),
  (cause) => infrastructureError({ message: 'Failed to list sessions', cause }),
).match(
  (s) => s,
  (error) => throwTrpcError({ error }),
)
```

---

### [SEVERITY: day-zero] D2 -- CORS allows no origins in production, blocking all cross-origin requests

**File:** `apps/api/src/index.ts:57-62`

**Issue:** When `NODE_ENV=production` and `TRUSTED_ORIGINS` is not set,
`allowedOrigins` becomes an empty array `[]`. The Hono CORS middleware
with `origin: []` will reject every cross-origin request. This means:

1. The frontend (Plan D) cannot communicate with the API in production
   unless `TRUSTED_ORIGINS` is explicitly configured.
2. Better Auth OAuth callbacks from Google/GitHub will fail because
   the redirect response needs CORS headers.
3. There is no fail-fast validation -- the server starts silently with
   broken CORS.

**Fix:** Add a startup validation that requires `TRUSTED_ORIGINS` to be
set when `NODE_ENV=production`. In the env schema:

```typescript
.refine(
  (env) => env.NODE_ENV !== 'production' || env.TRUSTED_ORIGINS.length > 0,
  { message: 'TRUSTED_ORIGINS must be set in production' },
)
```

Also pass `trustedOrigins` to Better Auth from the same source
(already done -- good).

---

### [SEVERITY: day-zero] D3 -- Rate limiter trusts X-Forwarded-For without validation

**File:** `apps/api/src/middleware/rate-limiter.ts:32-36`

**Issue:** The rate limiter `keyGenerator` reads `x-forwarded-for`
and `x-real-ip` headers directly. Any client can spoof these headers
to bypass rate limiting entirely. This makes the auth endpoint
rate limit (5 req/min) ineffective against determined attackers.

The security hardening plan (Plan C contract) specifically requires
brute-force rate limiting on auth endpoints. Spoofable headers
completely undermine this.

**Fix:** At minimum, document that a trusted reverse proxy (nginx,
Caddy) must strip/overwrite these headers. Better: add a
`TRUST_PROXY` env var. When false, use only the socket IP
(not available in Hono's `c.req` directly, but can be obtained
via the underlying request). When true, trust the forwarded headers.

```typescript
// When TRUST_PROXY is false or unset:
keyGenerator: () => 'global-limit'
// or use Hono's built-in conninfo helper
```

---

### [SEVERITY: day-zero] D4 -- `user.create` is a `publicProcedure` -- unauthenticated user creation

**File:** `apps/api/src/trpc/procedures/user.ts:89`

**Issue:** The `create` mutation on the user router uses
`publicProcedure`, meaning anyone can create users without
authentication. The JSDoc on `create-user.ts:19` says this is for
"admin-level user creation", but there is no admin guard.

Combined with no rate limiting on the user create endpoint
specifically, this allows unlimited user creation by anonymous
clients.

**Fix:** Change `publicProcedure` to `adminProcedure` for
`user.create`, since Better Auth handles public signup via
`/api/auth/sign-up/email`. If there is a legitimate need for
public user creation, it should at minimum use `authedProcedure`
and have its own rate limit.

---

## Important Findings (should fix)

### [SEVERITY: important] I1 -- Dual auth system creates confusion and dead code

**File:** `apps/api/src/use-cases/auth/authenticate.ts` (entire file)
**File:** `apps/api/src/trpc/procedures/auth.ts` (entire file)
**File:** `apps/api/src/adapters/db/drizzle-user-repository.ts:225-231`

**Issue:** Plan C introduces Better Auth for authentication
(`/api/auth/sign-in/email`), but the manual JWT-based auth flow
(`trpc.auth.login`) from Plan B is still wired and exposed.
The `createFindPasswordHash` function explicitly says it is
"DEPRECATED" and returns `null` always. This means:

1. The `trpc.auth.login` endpoint always fails (password hash is
   always null, so `invalidPassword` is always returned).
2. The `authenticate` use case, `auth.ts` procedure, JWT token
   service, and password service are dead code.
3. The container still wires and audit-logs the dead authenticate
   use case.

**Fix:** Either remove the dead auth flow entirely (preferred --
Better Auth owns auth now) or add a clear TODO with a timeline.
At minimum, remove the `trpc.auth.login` endpoint so clients
do not attempt to use a broken endpoint.

---

### [SEVERITY: important] I2 -- `AuthUser.role` is typed as `string | undefined` but guards compare to string literals

**File:** `apps/api/src/auth/types.ts:25`
**File:** `apps/api/src/trpc/context.ts:99,117`

**Issue:** The `role` field on `AuthUser` is typed as
`string | undefined`, but the admin guard compares
`opts.ctx.user.role !== 'admin'` and the dev guard compares
`role !== 'dev' && role !== 'admin'`. If Better Auth returns a
user without a role (undefined), both guards correctly reject.
However:

1. The type is too loose -- `role` should be a union of known
   values (`'user' | 'admin' | 'dev'`) to enable exhaustive
   checking.
2. The `UserInsertSchema` in schema already uses
   `z.enum(['user', 'admin', 'dev'])`, but this constraint is
   not reflected in the `AuthUser` type.
3. A typo in the database (`role = 'Admin'` instead of `'admin'`)
   would silently pass the authed guard but fail the admin guard,
   with no type-level protection.

**Fix:** Define a `Role` type and use it in `AuthUser`:

```typescript
type Role = 'user' | 'admin' | 'dev'

interface AuthUser {
  // ...
  readonly role: Role
}
```

---

### [SEVERITY: important] I3 -- Admin impersonation has no self-impersonation guard

**File:** `apps/api/src/trpc/procedures/admin.ts:48`

**Issue:** An admin can call `impersonate` with their own userId.
While Better Auth may handle this internally, there is no
explicit check preventing self-impersonation. This could create
confusing session states and audit log entries.

**Fix:** Add a guard before calling `impersonateUser`:

```typescript
if (opts.input.userId === opts.ctx.user.id) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Cannot impersonate yourself',
  })
}
```

---

### [SEVERITY: important] I4 -- Session procedures lack ownership validation

**File:** `apps/api/src/trpc/procedures/session.ts:64`

**Issue:** The `revoke` procedure accepts any session token as
input. While Better Auth likely validates that the session
belongs to the authenticated user, this is not explicitly
verified at the tRPC layer. If Better Auth has a bug or the
behavior changes, a user could revoke another user's session
by guessing or obtaining a token.

**Fix:** Verify token ownership at the tRPC layer:

```typescript
// After listing sessions for the user, verify the
// token belongs to the current user before revoking.
```

Or at minimum, add a comment documenting that Better Auth
enforces ownership internally.

---

### [SEVERITY: important] I5 -- Impersonation audit log is fire-and-forget

**File:** `apps/api/src/trpc/procedures/admin.ts:54-66,75-85`

**Issue:** The audit log for impersonation is fire-and-forget
(`writeAuditLog` returns `void` and catches errors internally).
For a security-critical action like impersonation, a failed
audit log write should arguably fail the entire operation.
The security hardening plan specifically calls for an
"impersonation audit" trail.

If the database is temporarily unavailable, an admin could
impersonate users with no record of having done so.

**Fix:** For impersonation specifically, use `await` on a
`ResultAsync`-wrapped audit write and fail the operation if
the audit cannot be recorded:

```typescript
const auditResult = await writeAuditLogAsync({ ... })
if (auditResult.isErr()) {
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Audit log failed -- operation aborted',
  })
}
```

---

## Notes (nice to have)

### [SEVERITY: note] N1 -- Better Auth session cookie configuration not explicitly set

**File:** `apps/api/src/auth/index.ts:43-78`

**Issue:** The `betterAuth()` config does not explicitly set
session cookie options (`httpOnly`, `secure`, `sameSite`,
`maxAge`). Better Auth uses reasonable defaults, but for a
security-focused boilerplate, explicit configuration documents
intent and prevents future library version changes from
weakening security.

**Fix:** Add explicit `session` configuration:

```typescript
session: {
  cookieCache: { enabled: true, maxAge: 300 },
  expiresIn: 60 * 60 * 24 * 7, // 7 days
  updateAge: 60 * 60 * 24, // 1 day
},
advanced: {
  cookiePrefix: 'voiler',
  useSecureCookies: env.NODE_ENV === 'production',
},
```

---

### [SEVERITY: note] N2 -- Guards test uses `{} as DbClient` cast

**File:** `apps/api/src/__tests__/trpc/guards.test.ts:51`

**Issue:** The test uses `{} as DbClient` which is a type cast.
While the project CLAUDE.md forbids `as any` and `as unknown`,
branded type casts (`as UserId`, `as Email`) and test fixture
casts are used elsewhere. This specific cast is to `DbClient`
which is a complex Drizzle type -- if a procedure accidentally
accesses `db`, it will get a runtime error instead of a
type error.

**Fix:** Consider creating a `makeMockDb()` test helper that
returns a properly typed stub, or document that `as DbClient`
is acceptable in test fixtures.

---

### [SEVERITY: note] N3 -- No test for impersonation or session procedures

**File:** (missing tests)

**Issue:** The test suite covers:

- Guard middleware (9 tests) -- good coverage
- Authenticate use case (4 tests) -- good coverage
- Create user use case (2 tests)
- Get user use case (2 tests)

But there are no tests for:

- Session procedures (list, revoke, revokeOthers, revokeAll)
- Admin impersonation procedures
- The session extraction middleware in `index.ts`

These are critical auth paths.

**Fix:** Add integration-style tests using `createCaller` with
mocked Better Auth API functions for session and admin
procedures.

---

### [SEVERITY: note] N4 -- `mapErrorCode` switch is not exhaustive-safe

**File:** `apps/api/src/trpc/procedures/user.ts:32-46`

**Issue:** The `switch` on `params.tag` covers all current
`AppError` tags, but TypeScript does not enforce exhaustiveness
because the return type is not narrowed per case. If a new
error tag is added to `AppError`, this function will silently
return `undefined`.

**Fix:** Add an exhaustive check:

```typescript
default: {
  const _exhaustive: never = params.tag
  return 'INTERNAL_SERVER_ERROR'
}
```

---

### [SEVERITY: note] N5 -- `user.list` returns all users to any authenticated user

**File:** `apps/api/src/trpc/procedures/user.ts:119`

**Issue:** The `list` procedure uses `authedProcedure`, meaning
any logged-in user can see the full user list. In most
applications, listing all users is an admin function.

**Fix:** Consider using `adminProcedure` or `devProcedure` for
the list endpoint, or add pagination and filtering to limit
data exposure.

---

### [SEVERITY: note] N6 -- Auth tables lack foreign key references

**File:** `packages/schema/src/entities/auth.ts:27,44`

**Issue:** The `session.userId` and `account.userId` columns
do not have `.references(() => User.id)` in the Drizzle schema.
While Better Auth manages referential integrity at the
application level, database-level foreign keys provide an
additional safety net and enable cascade deletes.

**Fix:** Add references:

```typescript
userId: text('user_id')
  .notNull()
  .references(() => User.id, { onDelete: 'cascade' }),
```

---

## What Was Done Well

1. **Hexagonal architecture maintained.** The container remains
   the sole adapter wiring point. tRPC procedures are thin and
   delegate to injected functions.

2. **Guard middleware is clean and well-tested.** The
   authed/admin/dev hierarchy is intuitive, with admin as
   superset of dev. 9 tests cover all role permutations.

3. **OAuth is genuinely optional.** The env schema validates
   that client ID and secret are set together, and the auth
   config conditionally adds providers. Zero config needed for
   email-only auth.

4. **Timing oracle fix is correct.** The authenticate use case
   runs a dummy hash when user is not found, equalizing response
   time to prevent user enumeration.

5. **Error sanitization in user procedures.** Infrastructure
   errors return "Internal server error" rather than raw DB
   messages. Error mapping is centralized in `mapErrorCode`.

6. **Auth schema follows Better Auth conventions.** The User,
   Session, Account, and Verification tables match Better Auth's
   expected schema, with the custom `role` field added via
   `additionalFields`.

7. **Env validation is thorough.** The `envSchema` uses
   `.refine()` for paired OAuth credentials and enforces minimum
   AUTH_SECRET length.

8. **Audit trail is wired for impersonation.** Both start and
   stop impersonation write audit entries with admin ID and
   target user ID.

---

## Summary

| Severity  | Count  |
| --------- | ------ |
| Day-zero  | 4      |
| Important | 5      |
| Note      | 6      |
| **Total** | **15** |

### Recommended merge approach

Fix D1-D4 before merging to main. D1 (unhandled rejections) and
D4 (public user creation) are the highest-risk items. I1 (dead
auth code) can be addressed in a fast-follow cleanup commit but
should not linger past Plan D.
