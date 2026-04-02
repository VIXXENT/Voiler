# Plan B Code Review -- feat/plan-b-trpc-domain

**Reviewer:** Claude Opus 4.6 (Senior Code Reviewer)
**Date:** 2026-04-01
**Scope:** All Plan B files (domain, core, schema, adapters, use cases, logging, tRPC, container, tests)

---

## Executive Summary

Plan B implementation is architecturally sound. The hexagonal architecture is properly layered, dependency inversion is respected, and the neverthrow error pattern is consistently applied. However, I identified **31 findings** across security, correctness, scalability, testing, and Plan C readiness.

**Breakdown:** 6 Critical, 10 Important, 15 Suggestions

---

## CRITICAL Findings (must fix)

### [SECURITY] C-01: Authentication timing oracle -- user existence leaks via response time

**File:** `apps/api/src/use-cases/auth/authenticate.ts:66-100`
**Description:** The authenticate use case performs `findByEmail` first, then only fetches the password hash and runs `argon2.verify` if the user exists. When a user does NOT exist, the function returns immediately with `UserNotFound`. When a user DOES exist but the password is wrong, the function performs expensive argon2 verification before returning. This timing difference (nanoseconds vs ~300ms for argon2) allows an attacker to enumerate valid email addresses.
**Impact:** Username enumeration attack. An attacker can determine which email addresses have accounts by measuring response time.
**Recommendation:** Always perform a dummy password hash verification even when the user is not found:

```typescript
if (user === null) {
  // Perform dummy verification to prevent timing attacks
  await passwordService.verify({
    plaintext: password,
    hash: '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy',
  })
  return errAsync(invalidPassword('Invalid credentials'))
}
```

Also note: the error message for "user not found" should be identical to "wrong password" -- both should say "Invalid credentials" to prevent enumeration via error messages.

### [SECURITY] C-02: Authentication leaks user existence via distinct error tags

**File:** `apps/api/src/use-cases/auth/authenticate.ts:69-70` and `apps/api/src/trpc/procedures/user.ts:28-41`
**Description:** The authenticate use case returns `UserNotFound` when the email does not match any user, but `InvalidPassword` when the password is wrong. The tRPC error mapper translates `UserNotFound` to `NOT_FOUND` (404) and `InvalidPassword` to `BAD_REQUEST` (400). This gives attackers two distinct signals to enumerate valid accounts.
**Impact:** Account enumeration via HTTP status codes and error messages.
**Recommendation:** The authenticate use case should return a single generic error for all authentication failures (e.g., `invalidPassword('Invalid credentials')`) regardless of whether the email or password was wrong. Never expose `UserNotFound` through auth endpoints.

### [SECURITY] C-03: No password maximum length -- Argon2 DoS vector

**File:** `packages/schema/src/inputs/create-user.ts:11-15` and `packages/domain/src/value-objects/password.ts:17-44`
**Description:** Neither the Zod schema nor the domain value object enforces a maximum password length. Argon2 will hash arbitrarily long inputs. An attacker can submit a 1MB password (within the body limit) to cause high CPU and memory consumption on the server.
**Impact:** Denial-of-Service via expensive hashing of oversized passwords. A single request with a 1MB password can consume significant server resources.
**Recommendation:** Add `.max(128)` or `.max(256)` to the password Zod schema in `create-user.ts` and `login.ts`. Also add a `MAX_LENGTH` check in the domain `createPassword` value object.

### [SECURITY] C-04: CORS allows empty origin array in production

**File:** `apps/api/src/index.ts:54-55`
**Description:** In production mode (`NODE_ENV !== 'development'`), `allowedOrigins` is set to an empty array `[]`. With Hono's `cors()` middleware, passing an empty array for `origin` means NO origin will be allowed, which will break ALL cross-origin requests including the frontend. But if the behavior differs across Hono versions and treats empty as "allow all", this becomes a security vulnerability.
**Impact:** Either the production frontend will not work at all (empty = deny all), or if Hono interprets empty array as permissive, all origins are allowed. Both outcomes are broken.
**Recommendation:** Add a `CORS_ORIGINS` environment variable to `config-env` and use it:

```typescript
const allowedOrigins: string[] = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(',')
  : env.NODE_ENV === 'development'
    ? ['http://localhost:3000']
    : []
```

### [SECURITY] C-05: Argon2 uses default parameters without explicit configuration

**File:** `apps/api/src/adapters/auth/argon2-password-service.ts:15`
**Description:** `argon2.hash(params.plaintext)` is called without explicit options. The `argon2` npm package defaults to `argon2i` (not `argon2id`), with `memoryCost: 65536` (64MB), `timeCost: 3`, `parallelism: 1`. The security plan explicitly mandates Argon2id. Also, OWASP recommends `parallelism: 1, memoryCost: 47104 (46 MiB), timeCost: 1` as minimum for Argon2id, or `memoryCost: 19456, timeCost: 2` for lower memory environments.
**Impact:** May use `argon2i` instead of the mandated `argon2id`, and parameters are implicitly controlled by library defaults that can change across versions.
**Recommendation:** Explicitly configure:

```typescript
argon2.hash(params.plaintext, {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
})
```

### [SCALABILITY] C-06: listUsers fetches ALL users with no pagination

**File:** `apps/api/src/use-cases/user/list-users.ts` and `apps/api/src/adapters/db/drizzle-user-repository.ts:101-112`
**Description:** `findAll()` executes `db.select().from(User)` with no `LIMIT` clause. The tRPC `user.list` procedure returns the full result set. With even a moderate number of users (10,000+), this will cause memory issues and slow responses.
**Impact:** Server OOM or extreme latency as user count grows. The `ResultAsync.combine(mapped)` in the repository also creates N concurrent `mapRowToEntity` ResultAsync objects, amplifying memory pressure.
**Recommendation:** Add pagination parameters to `findAll`:

```typescript
findAll: (params: { limit: number; offset: number }) => ResultAsync<UserEntity[], AppError>
```

And add a hard cap (e.g., `LIMIT 100`) even if no pagination params are provided. The tRPC procedure should accept `{ limit?: number; cursor?: string }`.

---

## IMPORTANT Findings (should fix)

### [SECURITY] I-01: Rate limiting trusts X-Forwarded-For without validation

**File:** `apps/api/src/middleware/rate-limiter.ts:32-35`
**Description:** The rate limiter `keyGenerator` uses `x-forwarded-for` as the primary source for client IP. Any client can spoof this header to bypass rate limiting entirely by rotating the header value on each request. This is only safe behind a trusted reverse proxy that strips/overwrites this header.
**Impact:** Rate limiting is completely bypassable in production without a trusted proxy that sets `x-forwarded-for`.
**Recommendation:** Add a `TRUST_PROXY` environment variable. When false, ignore `x-forwarded-for` and `x-real-ip` headers. Document that a reverse proxy must be configured to set these headers in production.

### [SECURITY] I-02: No brute-force rate limiting on auth endpoints

**File:** `apps/api/src/index.ts` (missing) and security plan Section 2
**Description:** The security hardening plan explicitly requires "5 req/min on `/api/auth/sign-in`" (Plan B responsibility). The current implementation only has a global rate limiter of 100/min. There is no stricter limit on the `auth.login` tRPC mutation.
**Impact:** An attacker can attempt 100 password guesses per minute per IP, far exceeding the planned 5/min limit.
**Recommendation:** Add a dedicated rate limiter for `/trpc/auth.login` with `max: 5, windowMs: 60000`. This should be applied as tRPC middleware or a Hono middleware on the specific path.

### [SECURITY] I-03: tRPC error messages expose internal details

**File:** `apps/api/src/trpc/procedures/user.ts:58-63`
**Description:** `throwTrpcError` passes `params.error.message` directly to the TRPCError. For `InfrastructureError`, this can include messages like "Failed to create user" with the original database error. While the `cause` is not passed, the `message` field from `infrastructureError` could contain stack traces if the error message construction changes.
**Impact:** Potential information disclosure of internal infrastructure details.
**Recommendation:** For `InfrastructureError` tag, return a generic message like "Internal server error" instead of the actual error message. Only pass through domain error messages (which are user-safe).

### [ARCHITECTURE] I-04: Use-case logger (withAuditLog) is defined but never wired

**File:** `apps/api/src/logging/use-case-logger.ts` and `apps/api/src/container.ts`
**Description:** The `withAuditLog` wrapper is exported and ready to use, but `container.ts` does not wrap any use case with it. The audit logging plan contract requires "Use-case interceptor: useCase, action, entityId, userId" to be operational.
**Impact:** No audit trail for use-case executions. The Plan B exit state requires "Structured logging: every request gets a `requestId`, logs to `audit_log` table" -- this is only partially met (request logger works, but use-case auditing is not wired).
**Recommendation:** Wire `withAuditLog` in `container.ts`:

```typescript
const createUser = withAuditLog({
  name: 'user.create',
  useCase: createCreateUser({ userRepository, passwordService }),
  getEntityId: (user) => String(user.id),
  db,
})
```

### [ARCHITECTURE] I-05: createFindPasswordHash not exported from adapters barrel

**File:** `apps/api/src/adapters/index.ts`
**Description:** `createFindPasswordHash` is exported from `drizzle-user-repository.ts` but not re-exported from `adapters/index.ts`. The `container.ts` imports it directly from the file path, bypassing the barrel. This is inconsistent with the barrel pattern used for all other adapters.
**Impact:** Inconsistent import patterns. Minor now, but creates confusion about what the "public API" of the adapters module is.
**Recommendation:** Add to `adapters/index.ts`:

```typescript
export { createFindPasswordHash } from './db/drizzle-user-repository.js'
```

### [TYPE SAFETY] I-06: UserEntity.role typed as string instead of union

**File:** `packages/domain/src/entities/user.ts:14`
**Description:** `role` is typed as `string` in the domain entity, but the schema enforces `z.enum(['user', 'admin', 'dev'])`. The domain layer should be the strictest layer, yet it accepts any string for role.
**Impact:** No compile-time safety when checking roles. Code like `if (user.role === 'adm1n')` will not cause a type error.
**Recommendation:** Define a `Role` type in the domain layer:

```typescript
export type Role = 'user' | 'admin' | 'dev'
```

And use it in `UserEntity`:

```typescript
readonly role: Role
```

### [TYPE SAFETY] I-07: InfrastructureError.cause typed as unknown

**File:** `packages/core/src/errors/app-error.ts:9`
**Description:** The `cause` field is `unknown`, which means the actual error is lost for logging/debugging purposes. While `unknown` is type-safe, there is no utility function to safely extract useful information from it.
**Impact:** When debugging infrastructure errors, the `cause` is opaque. Logs that stringify it with `String(error)` in `use-case-logger.ts:88` will produce `[object Object]` for most error objects.
**Recommendation:** Either type `cause` as `Error | unknown` and use `instanceof Error` checks, or provide a `formatCause` utility that safely extracts message and stack.

### [CORRECTNESS] I-08: UserId validation uses wrong error type

**File:** `packages/domain/src/value-objects/user-id.ts:28`
**Description:** When a UserId is empty, the error returned is `userNotFound('UserId must be a non-empty string')`. But an invalid input is not "user not found" -- it is an input validation error. The error semantics are wrong.
**Impact:** Code that pattern-matches on `UserNotFound` to mean "no such user in the database" will also match "someone passed an empty string as an ID", conflating two different error conditions.
**Recommendation:** Create an `InvalidUserId` error variant or use `ValidationError` for this case. At minimum, use a different domain error tag.

### [CORRECTNESS] I-09: cleanupAuditLog uses raw Promise without error handling

**File:** `apps/api/src/logging/cleanup.ts:33-49`
**Description:** `cleanupAuditLog` returns `Promise<void>` and uses `await` directly on the Drizzle delete operation. If the delete fails, the error propagates as an unhandled promise rejection when called with `void cleanupAuditLog({ db })` in `index.ts:132`. Since it is called fire-and-forget, a database error during cleanup will crash the process (unhandled rejection).
**Impact:** A database connectivity issue during startup cleanup would crash the server.
**Recommendation:** Wrap in try/catch inside `cleanupAuditLog`, or use `ResultAsync`, or add `.catch()` at the call site:

```typescript
void cleanupAuditLog({ db }).catch((err) => console.error('Audit log cleanup failed:', err))
```

### [PLAN DEVIATION] I-10: Missing update and delete tRPC procedures

**File:** `apps/api/src/trpc/procedures/user.ts`
**Description:** The Plan B contract specifies "User CRUD operations", and the `IUserRepository` port includes `update` and `delete` methods. The repository adapter implements both. However, there are no tRPC procedures for `user.update` or `user.delete`, and no corresponding use cases for these operations.
**Impact:** The "CRUD" contract is incomplete -- only CR (Create, Read) is exposed via tRPC. The L (List) is a bonus, but U (Update) and D (Delete) are missing.
**Recommendation:** This may be intentional (Plan C adds auth-protected mutations), but it should be explicitly documented as deferred. If intentional, add a `// TODO: Plan C` comment to the user router.

---

## SUGGESTIONS (nice to have)

### [CODE SMELL] S-01: Duplicate mapToPublicUser / makeFakeUser across test files

**File:** Multiple test files
**Description:** `makeFakeUser` and `makeMockRepo` are copy-pasted across `create-user.test.ts`, `get-user.test.ts`, and `authenticate.test.ts`. This violates DRY and means updating the UserEntity shape requires changes in 3+ files.
**Recommendation:** Extract shared test fixtures to `apps/api/src/__tests__/fixtures.ts`.

### [CODE SMELL] S-02: console.warn used for info-level structured logs

**File:** `apps/api/src/logging/request-logger.ts:60` and `use-case-logger.ts:44,58`
**Description:** Info-level structured logs are emitted via `console.warn()` instead of `console.info()` or `console.log()`. The `level: 'info'` field in the JSON payload contradicts the console severity level used.
**Recommendation:** Use `console.info()` for info-level logs and `console.warn()` for warn-level logs, or use a proper logging library (e.g., pino) that handles levels correctly.

### [CODE SMELL] S-03: AuditLog table defined in logging module instead of schema package

**File:** `apps/api/src/logging/audit-log.repository.ts:10-22`
**Description:** The `AuditLog` table is defined in the API app's logging module and then re-exported in `db/schema.ts`. All other tables (User) are defined in `@voiler/schema`. This inconsistency means drizzle-kit migration generation depends on the API app's internal module structure.
**Recommendation:** Move the `AuditLog` table definition to `packages/schema/src/entities/audit-log.ts` for consistency.

### [TESTING] S-04: No tests for listUsers use case

**File:** Missing `apps/api/src/__tests__/use-cases/list-users.test.ts`
**Description:** The `listUsers` use case has no unit tests. While it is simple (delegates to `findAll`), consistency requires testing it, especially error paths.
**Recommendation:** Add a test file for `listUsers` with happy path and error cases.

### [TESTING] S-05: No edge case tests for email validation

**File:** `packages/domain/src/__tests__/value-objects/email.test.ts`
**Description:** Missing test cases for: emails with consecutive dots (`a..b@c.com`), emails with leading/trailing dots in local part, emails longer than 254 characters (RFC 5321 limit), emails with special characters, and internationalized domain names.
**Recommendation:** Add edge case tests. The current regex is intentionally simple, but the tests should document what it does and does not catch.

### [TESTING] S-06: No tests for tRPC procedures or router integration

**File:** Missing
**Description:** There are no integration tests for the tRPC procedures. The `throwTrpcError` mapping, input validation via Zod schemas through tRPC, and the router wiring are all untested.
**Recommendation:** Add integration tests that call `appRouter.createCaller(ctx)` with mock context and verify end-to-end procedure behavior including error mapping.

### [TESTING] S-07: No tests for DrizzleUserRepository

**File:** Missing
**Description:** The most complex adapter (`drizzle-user-repository.ts`, 247 lines) has zero tests. The `mapRowToEntity` function, error handling for empty result sets, and the `findPasswordHash` query are all untested.
**Recommendation:** Add integration tests with a test database, or at minimum unit tests with a mocked Drizzle client.

### [TESTING] S-08: No tests for Argon2 and JWT adapters

**File:** Missing
**Description:** `argon2-password-service.ts` and `jwt-token-service.ts` have no tests. These are critical security components.
**Recommendation:** Add tests that verify: hashing produces different output each time, verification succeeds for correct password, verification fails for wrong password, JWT round-trip (generate then verify), expired token rejection.

### [FUTURE MAINTENANCE] S-09: tRPC context lacks user/session fields for Plan C

**File:** `apps/api/src/trpc/context.ts:11-15`
**Description:** The `TRPCContext` interface has `db` and `requestId` but no `user` or `session` fields. Plan C will need to add these, which means every existing procedure's type context changes.
**Recommendation:** Add optional fields now to ease the Plan C transition:

```typescript
readonly user?: unknown  // Populated by Plan C auth middleware
readonly session?: unknown  // Populated by Plan C auth middleware
```

### [FUTURE MAINTENANCE] S-10: authedProcedure/adminProcedure/devProcedure are identical to publicProcedure

**File:** `apps/api/src/trpc/context.ts:55-70`
**Description:** All four procedure types are `t.procedure` with no differentiation. While documented as "placeholder for Plan C", any code using `authedProcedure` today gets zero protection.
**Recommendation:** This is documented and intentional, but consider adding a `console.warn` in development mode when these are used, to flag that auth is not yet enforced.

### [CODE SMELL] S-11: Email validation regex is overly permissive

**File:** `packages/domain/src/value-objects/email.ts:21`
**Description:** The regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` accepts many invalid emails like `a@b.c` (single char TLD, technically valid but often rejected), `"spaces here"@example.com` (the quotes are not handled), and emails with consecutive special characters. Additionally, the Zod schema in `create-user.ts` uses `z.string().email()` which has different validation rules. This means an email could pass Zod validation at the tRPC boundary but fail domain validation, or vice versa.
**Recommendation:** Either use a single validation source (Zod's `.email()` at the boundary and trust it in the domain), or align the regex with Zod's implementation. At minimum, document why there are two different email validators.

### [CODE SMELL] S-12: request-logger uses module augmentation for Hono context

**File:** `apps/api/src/logging/request-logger.ts:3-7`
**Description:** The `declare module 'hono'` augmentation adds `requestId` to `ContextVariableMap` globally. If another module also augments `ContextVariableMap`, merge conflicts or unexpected behavior could occur. This augmentation is also not co-located with the Hono app definition.
**Recommendation:** Consider moving the module augmentation to a dedicated `types/hono.d.ts` file within the api app, or use Hono's generic type parameter approach instead.

### [CORRECTNESS] S-13: Update use case missing from container despite repository support

**File:** `apps/api/src/container.ts`
**Description:** The container exposes `createUser`, `getUser`, `listUsers`, and `authenticate`, but `IUserRepository` also defines `update` and `delete`. There are no use cases wrapping these operations, meaning direct repository access is the only way to update/delete users.
**Recommendation:** Create `updateUser` and `deleteUser` use cases even if they are not yet exposed via tRPC. This ensures all repository operations are mediated by use cases, maintaining hexagonal purity.

### [CODE SMELL] S-14: createEmail error message includes raw user input

**File:** `packages/domain/src/value-objects/email.ts:33`
**Description:** `invalidEmail(\`"${value}" is not a valid email address\`)`includes the raw user-supplied email in the error message. If this error message is ever logged or returned to a client, it could leak PII or be used for log injection.
**Recommendation:** Use a generic message:`'Invalid email address format'` without including the actual value.

### [OPERATIONAL] S-15: No structured error logging for cleanupAuditLog failure

**File:** `apps/api/src/logging/cleanup.ts:33-49`
**Description:** If the cleanup query fails, the `await` will throw, but there is no catch block. The success case logs structured JSON, but the failure case is silent (or crashes the process as noted in I-09).
**Recommendation:** Wrap in try/catch with structured JSON error logging matching the pattern used elsewhere.

---

## Plan Contract Compliance Summary

| Contract Requirement                                             | Status             | Notes                                                 |
| ---------------------------------------------------------------- | ------------------ | ----------------------------------------------------- |
| tRPC endpoint at `/trpc` with User CRUD                          | PARTIAL            | Create, Read, List work; Update/Delete missing (I-10) |
| Vitest unit tests for domain + use-cases                         | PASS               | Domain VOs and 3 use cases tested                     |
| Full hexagonal flow: tRPC -> use case -> ports -> adapters -> DB | PASS               | Clean separation maintained                           |
| Structured logging: requestId per request                        | PASS               | request-logger middleware works                       |
| Structured logging: logs to audit_log table                      | PARTIAL            | Table exists but use-case logger not wired (I-04)     |
| Log rolling: 30 days auto-delete                                 | PASS               | cleanupAuditLog runs at startup                       |
| tRPC guards: public, authed, admin, dev                          | PASS (placeholder) | Defined but no auth enforcement (Plan C)              |
| Auth endpoint rate limit: 5 req/min                              | FAIL               | Not implemented (I-02)                                |
| Error sanitization in prod                                       | PARTIAL            | Infrastructure errors leak messages (I-03)            |
| tRPC uses POST for mutations                                     | PASS               | create and login are mutations                        |

---

## Security Hardening Plan Compliance (Plan B items)

| Security Measure                       | Status             | Finding                          |
| -------------------------------------- | ------------------ | -------------------------------- |
| Input validation at boundary (Zod)     | PASS               | All tRPC inputs validated        |
| authedProcedure middleware             | PASS (placeholder) |                                  |
| roleGuard middleware                   | PASS (placeholder) |                                  |
| Object-level authorization             | NOT APPLICABLE     | No resource-scoped ops yet       |
| No direct DB access from routes        | PASS               |                                  |
| Error messages don't leak internals    | PARTIAL            | I-03                             |
| Auth endpoint rate limit (5/min)       | FAIL               | I-02                             |
| tRPC endpoint rate limit (60/min/user) | FAIL               | Not implemented                  |
| requestId correlation                  | PASS               |                                  |
| Auth events logged                     | PARTIAL            | Login success not audited (I-04) |
| CRUD actions logged                    | FAIL               | withAuditLog not wired (I-04)    |
| No secrets in logs                     | PASS               |                                  |
| Log rolling (30 days)                  | PASS               |                                  |
| Secure password requirements           | PASS               | Min 8, letter+digit              |
| tRPC uses POST for mutations           | PASS               |                                  |

---

## Total Findings: 31

| Severity   | Count |
| ---------- | ----- |
| Critical   | 6     |
| Important  | 10    |
| Suggestion | 15    |

**Top 3 priorities for immediate action:**

1. Fix authentication timing oracle and error enumeration (C-01, C-02)
2. Add password maximum length (C-03)
3. Wire audit logging and add auth rate limiting (I-02, I-04)
