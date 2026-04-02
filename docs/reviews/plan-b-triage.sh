#!/usr/bin/env bash
# Plan B Code Review -- Triage Issue Creation Script
# Run after: gh auth login -h github.com
# From repo root: bash docs/reviews/plan-b-triage.sh

set -euo pipefail

REPO="VIXXENT/Voiler"

# Ensure labels exist
gh label create "plan-b" --color "1d76db" --description "Plan B: tRPC + Domain" --repo "$REPO" 2>/dev/null || true
gh label create "priority:critical" --color "b60205" --description "Day-zero: must fix before merge" --repo "$REPO" 2>/dev/null || true
gh label create "priority:high" --color "d93f0b" --description "Blocker: must fix before Plan C" --repo "$REPO" 2>/dev/null || true
gh label create "priority:medium" --color "fbca04" --description "Should fix soon" --repo "$REPO" 2>/dev/null || true

echo "=== DAY-ZERO ISSUES (3) ==="

# C-03: No password maximum length
gh issue create --repo "$REPO" \
  --label "priority:critical,plan-b" \
  --title "[SECURITY] No password maximum length -- Argon2 DoS vector" \
  --body "$(cat <<'EOF'
## Finding
Neither the Zod schema nor the domain value object enforces a maximum password length. Argon2 will hash arbitrarily long inputs. An attacker can submit a 1MB password (within the body limit) to cause high CPU and memory consumption on the server.

**Files:** `packages/schema/src/inputs/create-user.ts:11-15` and `packages/domain/src/value-objects/password.ts:17-44`

## Impact
Denial-of-Service via expensive hashing of oversized passwords. A single request with a 1MB password can consume significant server resources.

## Recommendation
Add `.max(128)` to the password Zod schema in `create-user.ts` and `login.ts`. Also add a `MAX_LENGTH` check in the domain `createPassword` value object.

## Source
Code review of Plan B -- Finding C-03
EOF
)"

# C-05: Argon2 uses default parameters
gh issue create --repo "$REPO" \
  --label "priority:critical,plan-b" \
  --title "[SECURITY] Argon2 uses default params -- may use argon2i instead of argon2id" \
  --body "$(cat <<'EOF'
## Finding
`argon2.hash(params.plaintext)` is called without explicit options. The `argon2` npm package defaults to `argon2i` (not `argon2id`), with default memory/time/parallelism. The security plan explicitly mandates Argon2id.

**File:** `apps/api/src/adapters/auth/argon2-password-service.ts:15`

## Impact
May use `argon2i` instead of the mandated `argon2id`, and parameters are implicitly controlled by library defaults that can change across versions.

## Recommendation
Explicitly configure:
```typescript
argon2.hash(params.plaintext, {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
})
```

## Source
Code review of Plan B -- Finding C-05
EOF
)"

# I-09: cleanupAuditLog unhandled promise
gh issue create --repo "$REPO" \
  --label "priority:critical,plan-b" \
  --title "[CORRECTNESS] cleanupAuditLog unhandled promise rejection crashes server" \
  --body "$(cat <<'EOF'
## Finding
`cleanupAuditLog` returns `Promise<void>` and is called fire-and-forget with `void cleanupAuditLog({ db })`. If the delete query fails, the error propagates as an unhandled promise rejection, crashing the process.

**File:** `apps/api/src/logging/cleanup.ts:33-49` and call site in `apps/api/src/index.ts:132`

## Impact
A database connectivity issue during startup cleanup would crash the server.

## Recommendation
Add `.catch()` at the call site:
```typescript
void cleanupAuditLog({ db }).catch((err) =>
  console.error('Audit log cleanup failed:', err)
)
```

## Source
Code review of Plan B -- Finding I-09
EOF
)"

echo ""
echo "=== BLOCKER ISSUES (4) ==="

# C-01 + C-02: Auth timing oracle + error enumeration (combined -- same fix)
gh issue create --repo "$REPO" \
  --label "priority:high,plan-b" \
  --title "[SECURITY] Auth timing oracle + error enumeration leak user existence" \
  --body "$(cat <<'EOF'
## Finding (C-01 + C-02 combined)
The authenticate use case has two user-enumeration vectors:

1. **Timing oracle:** When a user does NOT exist, the function returns immediately. When a user DOES exist but password is wrong, it performs expensive argon2 verification (~300ms). This timing difference reveals valid emails.
2. **Distinct error tags:** Returns `UserNotFound` vs `InvalidPassword` with different HTTP status codes (404 vs 400), giving attackers two distinct signals.

**File:** `apps/api/src/use-cases/auth/authenticate.ts:66-100`

## Impact
Username enumeration attack. Attackers can determine which email addresses have accounts.

## Recommendation
**This should be fixed as part of Plan C's auth rewrite with Better Auth.** Plan C must ensure:
- Dummy hash verification when user not found (constant-time response)
- Single generic error for all auth failures ("Invalid credentials")
- No distinct HTTP status codes for email-not-found vs wrong-password

If the current authenticate use case survives into Plan C, fix by adding dummy `passwordService.verify()` on user-not-found path and returning `invalidPassword('Invalid credentials')` for both cases.

## Plan C Note
This is classified as blocker (not day-zero) because Plan C will rewrite auth flows with Better Auth. The fix belongs there, but must not be forgotten.

## Source
Code review of Plan B -- Findings C-01 and C-02
EOF
)"

# I-02: No brute-force rate limiting on auth
gh issue create --repo "$REPO" \
  --label "priority:high,plan-b" \
  --title "[SECURITY] No brute-force rate limiting on auth endpoints (plan contract FAIL)" \
  --body "$(cat <<'EOF'
## Finding
The security hardening plan explicitly requires "5 req/min on /api/auth/sign-in" as a Plan B responsibility. The current implementation only has a global rate limiter of 100/min. There is no stricter limit on the `auth.login` tRPC mutation.

**File:** `apps/api/src/index.ts` (missing) -- security plan Section 2

## Impact
An attacker can attempt 100 password guesses per minute per IP, far exceeding the planned 5/min limit. This is marked FAIL in the plan contract compliance check.

## Recommendation
Add a dedicated rate limiter for `/trpc/auth.login` with `max: 5, windowMs: 60000`. Apply as tRPC middleware or Hono middleware on the specific path.

## Source
Code review of Plan B -- Finding I-02
EOF
)"

# I-03: tRPC error messages expose internals
gh issue create --repo "$REPO" \
  --label "priority:high,plan-b" \
  --title "[SECURITY] tRPC error messages expose internal infrastructure details" \
  --body "$(cat <<'EOF'
## Finding
`throwTrpcError` passes `params.error.message` directly to TRPCError. For `InfrastructureError`, this can include internal database error details. Templates get copied, so this matters.

**File:** `apps/api/src/trpc/procedures/user.ts:58-63`

## Impact
Potential information disclosure of internal infrastructure details to API consumers.

## Recommendation
For `InfrastructureError` tag, return a generic message like "Internal server error" instead of the actual error message. Only pass through domain error messages (which are user-safe).

## Source
Code review of Plan B -- Finding I-03
EOF
)"

# I-04: withAuditLog not wired
gh issue create --repo "$REPO" \
  --label "priority:high,plan-b" \
  --title "[ARCHITECTURE] withAuditLog wrapper defined but never wired in container" \
  --body "$(cat <<'EOF'
## Finding
The `withAuditLog` wrapper is exported and ready to use, but `container.ts` does not wrap any use case with it. The Plan B contract requires "Use-case interceptor: useCase, action, entityId, userId" to be operational. This is marked PARTIAL/FAIL in contract compliance.

**Files:** `apps/api/src/logging/use-case-logger.ts` and `apps/api/src/container.ts`

## Impact
No audit trail for use-case executions. The Plan B exit state requires structured audit logging.

## Recommendation
Wire `withAuditLog` in `container.ts` for all use cases:
```typescript
const createUser = withAuditLog({
  name: 'user.create',
  useCase: createCreateUser({ userRepository, passwordService }),
  getEntityId: (user) => String(user.id),
  db,
})
```

## Source
Code review of Plan B -- Finding I-04
EOF
)"

echo ""
echo "=== MEDIUM ISSUES (7) ==="

# C-06: listUsers no pagination
gh issue create --repo "$REPO" \
  --label "priority:medium,plan-b" \
  --title "[SCALABILITY] listUsers fetches ALL users with no pagination" \
  --body "$(cat <<'EOF'
## Finding
`findAll()` executes `db.select().from(User)` with no LIMIT clause. The tRPC `user.list` procedure returns the full result set.

**Files:** `apps/api/src/use-cases/user/list-users.ts` and `apps/api/src/adapters/db/drizzle-user-repository.ts:101-112`

## Impact
Server OOM or extreme latency as user count grows. The `ResultAsync.combine(mapped)` amplifies memory pressure.

## Recommendation
Add pagination parameters to `findAll` with a hard cap (e.g., LIMIT 100). tRPC procedure should accept `{ limit?: number; cursor?: string }`.

## Source
Code review of Plan B -- Finding C-06
EOF
)"

# I-01: Rate limit trusts X-Forwarded-For
gh issue create --repo "$REPO" \
  --label "priority:medium,plan-b" \
  --title "[SECURITY] Rate limiter trusts X-Forwarded-For without validation" \
  --body "$(cat <<'EOF'
## Finding
The rate limiter `keyGenerator` uses `x-forwarded-for` as the primary source for client IP. Any client can spoof this header to bypass rate limiting entirely.

**File:** `apps/api/src/middleware/rate-limiter.ts:32-35`

## Impact
Rate limiting is completely bypassable without a trusted reverse proxy.

## Recommendation
Add a `TRUST_PROXY` environment variable. When false, ignore forwarded headers. Document reverse proxy requirements for production.

## Source
Code review of Plan B -- Finding I-01
EOF
)"

# I-06: UserEntity.role typed as string
gh issue create --repo "$REPO" \
  --label "priority:medium,plan-b" \
  --title "[TYPE SAFETY] UserEntity.role typed as string instead of union type" \
  --body "$(cat <<'EOF'
## Finding
`role` is typed as `string` in the domain entity, but the schema enforces `z.enum(['user', 'admin', 'dev'])`. The domain layer should be the strictest layer.

**File:** `packages/domain/src/entities/user.ts:14`

## Impact
No compile-time safety when checking roles. Typos like `user.role === 'adm1n'` won't cause type errors.

## Recommendation
Define `type Role = 'user' | 'admin' | 'dev'` in the domain layer and use it in `UserEntity`.

## Source
Code review of Plan B -- Finding I-06
EOF
)"

# I-08: UserId wrong error type
gh issue create --repo "$REPO" \
  --label "priority:medium,plan-b" \
  --title "[CORRECTNESS] UserId validation uses wrong error type (UserNotFound)" \
  --body "$(cat <<'EOF'
## Finding
When a UserId is empty, the error returned is `userNotFound('UserId must be a non-empty string')`. An invalid input is not "user not found" -- it's a validation error.

**File:** `packages/domain/src/value-objects/user-id.ts:28`

## Impact
Code that pattern-matches on `UserNotFound` to mean "no such user in DB" will also match "empty string ID", conflating two error conditions.

## Recommendation
Create an `InvalidUserId` error variant or use `ValidationError` for this case.

## Source
Code review of Plan B -- Finding I-08
EOF
)"

# S-03: AuditLog table location
gh issue create --repo "$REPO" \
  --label "priority:medium,plan-b" \
  --title "[ARCHITECTURE] AuditLog table defined in API app instead of schema package" \
  --body "$(cat <<'EOF'
## Finding
The `AuditLog` table is defined in `apps/api/src/logging/audit-log.repository.ts` and re-exported in `db/schema.ts`. All other tables are in `@voiler/schema`. This means drizzle-kit migrations depend on the API app's internal structure.

**File:** `apps/api/src/logging/audit-log.repository.ts:10-22`

## Recommendation
Move the `AuditLog` table definition to `packages/schema/src/entities/audit-log.ts` for consistency.

## Source
Code review of Plan B -- Finding S-03
EOF
)"

# S-06: No tRPC integration tests
gh issue create --repo "$REPO" \
  --label "priority:medium,plan-b" \
  --title "[TESTING] No integration tests for tRPC procedures" \
  --body "$(cat <<'EOF'
## Finding
There are no integration tests for tRPC procedures. The `throwTrpcError` mapping, Zod input validation through tRPC, and router wiring are all untested.

**Files:** Missing test files for tRPC layer

## Recommendation
Add integration tests using `appRouter.createCaller(ctx)` with mock context to verify end-to-end procedure behavior including error mapping.

## Source
Code review of Plan B -- Findings S-06, S-07, S-08 (consolidated)

Note: S-07 (no DrizzleUserRepository tests) and S-08 (no Argon2/JWT adapter tests) are related. A single test infrastructure effort can address all three.
EOF
)"

# S-14: Email in error message leaks PII
gh issue create --repo "$REPO" \
  --label "priority:medium,plan-b" \
  --title "[SECURITY] Email value object error includes raw user input (PII leak)" \
  --body "$(cat <<'EOF'
## Finding
`invalidEmail(\`"${value}" is not a valid email address\`)` includes the raw user-supplied email in the error message. If logged or returned to client, this leaks PII.

**File:** `packages/domain/src/value-objects/email.ts:33`

## Recommendation
Use a generic message: `'Invalid email address format'` without including the actual value.

## Source
Code review of Plan B -- Finding S-14
EOF
)"

echo ""
echo "=== ALL ISSUES CREATED ==="
echo "Day-zero: 3 issues (C-03, C-05, I-09)"
echo "Blocker: 4 issues (C-01+C-02, I-02, I-03, I-04)"
echo "Medium: 7 issues (C-06, I-01, I-06, I-08, S-03, S-06+S-07+S-08, S-14)"
echo "Discarded: 17 findings (see triage summary)"
