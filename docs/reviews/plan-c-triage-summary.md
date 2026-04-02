# Plan C (Better Auth) -- Triage Summary

**Date:** 2026-04-01
**Triaged by:** Claude Opus 4.6 (1M context)
**Review source:** `docs/reviews/plan-c-code-review.md`

---

## Triage Decisions

| ID  | Finding                                                  | Severity (review) | Triage Decision | Action                                                       |
| --- | -------------------------------------------------------- | ----------------- | --------------- | ------------------------------------------------------------ |
| D1  | Unhandled Promise rejections in session/admin procedures | day-zero          | **day-zero**    | Fix before merge                                             |
| D2  | CORS allows no origins in production                     | day-zero          | **trivial**     | Already fixed in commit `de48169` (TRUSTED_ORIGINS env var)  |
| D3  | Rate limiter trusts X-Forwarded-For                      | day-zero          | **trivial**     | Already tracked as issue #50 (Plan B)                        |
| D4  | `user.create` is public                                  | day-zero          | **trivial**     | Intentional -- this is user registration, anyone can sign up |
| I1  | Dual auth system / dead code                             | important         | **day-zero**    | Dead `auth.login` tRPC route must be removed before merge    |
| I2  | `AuthUser.role` typed as `string`                        | important         | **trivial**     | Already tracked as issue #51                                 |
| I3  | Admin self-impersonation guard                           | important         | **medium**      | GitHub issue created                                         |
| I4  | Session ownership validation                             | important         | **medium**      | GitHub issue created                                         |
| I5  | Impersonation audit is fire-and-forget                   | important         | **blocker**     | GitHub issue created                                         |
| N1  | Cookie configuration not explicit                        | important         | **medium**      | GitHub issue created                                         |
| N2  | `{} as DbClient` cast in tests                           | note              | **trivial**     | Acceptable in test fixtures per project conventions          |
| N3  | No tests for session/admin procedures                    | note              | **medium**      | GitHub issue created                                         |
| N4  | `mapErrorCode` switch not exhaustive                     | note              | **medium**      | GitHub issue created                                         |
| N5  | `user.list` returns all users to any authed user         | note              | **medium**      | GitHub issue created                                         |
| N6  | Auth tables lack FK references                           | note              | **medium**      | GitHub issue created                                         |

> **Note:** GitHub API was unreachable during triage. Issue creation
> commands are saved in `docs/reviews/plan-c-triage.sh`. Run
> `bash docs/reviews/plan-c-triage.sh` when connectivity is restored.

---

## Summary by Decision

| Decision | Count | Details                                                                                    |
| -------- | ----- | ------------------------------------------------------------------------------------------ |
| day-zero | 2     | D1 (unhandled promises), I1 (dead auth code)                                               |
| blocker  | 1     | I5 (audit must not be fire-and-forget)                                                     |
| medium   | 8     | I3, I4, N1, N3, N4, N5, N6                                                                 |
| trivial  | 4     | D2 (already fixed), D3 (issue #50), D4 (intentional), I2 (issue #51), N2 (test convention) |

---

## Day-Zero Fixes (must do before merge)

### D1 -- Wrap Better Auth API calls in ResultAsync

**Files:**

- `apps/api/src/trpc/procedures/session.ts`
- `apps/api/src/trpc/procedures/admin.ts`

All bare `await` calls to Better Auth API (`listSessions`,
`revokeSession`, `revokeOtherSessions`, `revokeSessions`,
`impersonateUser`, `stopImpersonating`) must be wrapped in
`ResultAsync.fromPromise()` with error handling through
`throwTrpcError()`. This is both a security concern (error
leakage) and a project mandate violation (unguarded throws).

### I1 -- Remove dead auth.login tRPC route

**Files:**

- `apps/api/src/use-cases/auth/authenticate.ts` (dead code)
- `apps/api/src/trpc/procedures/auth.ts` (dead code)
- `apps/api/src/adapters/db/drizzle-user-repository.ts:225-231` (deprecated fn)
- Container wiring for authenticate use case

Better Auth owns authentication now. The manual JWT-based
`trpc.auth.login` endpoint always fails (password hash returns
null). Remove the dead flow entirely: the use case, the tRPC
procedure, and the container wiring. Keep the JWT/password
services only if they serve another purpose.

---

## Blocker Issues (must fix before Plan D)

### I5 -- Impersonation audit must not be fire-and-forget

For the security-critical impersonation action, a failed audit
log write must abort the operation. This is explicitly required
by the security hardening plan. Must be resolved before Plan D
adds the frontend that admins will use.

---

## Trivial Discards (with justification)

| ID  | Justification                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D2  | Fixed in commit `de48169` -- TRUSTED_ORIGINS env var added with validation                                                                                                                                                    |
| D3  | Already tracked as issue #50 from Plan B review                                                                                                                                                                               |
| D4  | Intentional design: `user.create` is user registration. Better Auth's `/api/auth/sign-up/email` is the primary path, but tRPC route serves admin/programmatic creation. Rate limiting on auth endpoints already covers abuse. |
| I2  | Already tracked as issue #51 (role type safety)                                                                                                                                                                               |
| N2  | `as DbClient` in test fixtures is acceptable per project conventions (branded type casts and test fixture casts are used throughout)                                                                                          |
