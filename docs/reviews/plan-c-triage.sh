#!/usr/bin/env bash
# Plan C Triage -- GitHub Issue Creation Script
# Run: bash docs/reviews/plan-c-triage.sh
# Prerequisites: gh auth login
set -euo pipefail

REPO="VIXXENT/Voiler"

echo "=== Creating blocker issue (I5) ==="
gh issue create --repo "$REPO" \
  --title "Impersonation audit log must not be fire-and-forget" \
  --label "priority:high,plan-c" \
  --body "$(cat <<'EOF'
## Context

From Plan C code review finding I5.

**Files:** `apps/api/src/trpc/procedures/admin.ts:54-66,75-85`

## Problem

The audit log for impersonation is fire-and-forget (`writeAuditLog` returns `void` and catches errors internally). For a security-critical action like impersonation, a failed audit log write should fail the entire operation. The security hardening plan specifically requires an impersonation audit trail.

If the database is temporarily unavailable, an admin could impersonate users with no record of having done so.

## Fix

For impersonation specifically, wrap the audit write in `ResultAsync` and fail the operation if the audit cannot be recorded:

```typescript
const auditResult = await writeAuditLogAsync({ ... })
if (auditResult.isErr()) {
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Audit log failed -- operation aborted',
  })
}
```

## Priority

Blocker -- must fix before Plan D starts.
EOF
)"

echo "=== Creating medium issue (I3) ==="
gh issue create --repo "$REPO" \
  --title "Add self-impersonation guard in admin procedures" \
  --label "priority:medium,plan-c" \
  --body "$(cat <<'EOF'
## Context

From Plan C code review finding I3.

**File:** `apps/api/src/trpc/procedures/admin.ts:48`

## Problem

An admin can call `impersonate` with their own userId. While Better Auth may handle this internally, there is no explicit check preventing self-impersonation. This could create confusing session states and audit log entries.

## Fix

Add a guard before calling `impersonateUser`:

```typescript
if (opts.input.userId === opts.ctx.user.id) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Cannot impersonate yourself',
  })
}
```
EOF
)"

echo "=== Creating medium issue (I4) ==="
gh issue create --repo "$REPO" \
  --title "Add session ownership validation at tRPC layer" \
  --label "priority:medium,plan-c" \
  --body "$(cat <<'EOF'
## Context

From Plan C code review finding I4.

**File:** `apps/api/src/trpc/procedures/session.ts:64`

## Problem

The `revoke` procedure accepts any session token as input. While Better Auth likely validates that the session belongs to the authenticated user, this is not explicitly verified at the tRPC layer. If Better Auth has a bug or the behavior changes, a user could revoke another user's session by guessing or obtaining a token.

## Fix

Verify token ownership at the tRPC layer by listing sessions for the current user and confirming the target token belongs to them before revoking. Or at minimum, add a comment documenting that Better Auth enforces ownership internally.
EOF
)"

echo "=== Creating medium issue (N1) ==="
gh issue create --repo "$REPO" \
  --title "Explicitly configure Better Auth session cookie options" \
  --label "priority:medium,plan-c" \
  --body "$(cat <<'EOF'
## Context

From Plan C code review finding N1.

**File:** `apps/api/src/auth/index.ts:43-78`

## Problem

The `betterAuth()` config does not explicitly set session cookie options (`httpOnly`, `secure`, `sameSite`, `maxAge`). Better Auth uses reasonable defaults, but for a security-focused boilerplate, explicit configuration documents intent and prevents future library version changes from weakening security.

## Fix

Add explicit `session` and `advanced` configuration:

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
EOF
)"

echo "=== Creating medium issue (N3) ==="
gh issue create --repo "$REPO" \
  --title "Add tests for session and admin impersonation procedures" \
  --label "priority:medium,plan-c" \
  --body "$(cat <<'EOF'
## Context

From Plan C code review finding N3.

## Problem

The test suite covers guard middleware (9 tests), authenticate use case (4 tests), create/get user (4 tests), but has no tests for:

- Session procedures (list, revoke, revokeOthers, revokeAll)
- Admin impersonation procedures (impersonate, stopImpersonating)
- Session extraction middleware in `index.ts`

These are critical auth paths.

## Fix

Add integration-style tests using `createCaller` with mocked Better Auth API functions for session and admin procedures.
EOF
)"

echo "=== Creating medium issue (N4) ==="
gh issue create --repo "$REPO" \
  --title "Add exhaustive check to mapErrorCode switch" \
  --label "priority:medium,plan-c" \
  --body "$(cat <<'EOF'
## Context

From Plan C code review finding N4.

**File:** `apps/api/src/trpc/procedures/user.ts:32-46`

## Problem

The `switch` on `params.tag` covers all current `AppError` tags, but TypeScript does not enforce exhaustiveness. If a new error tag is added to `AppError`, this function will silently return `undefined`.

## Fix

Add an exhaustive check in the default case:

```typescript
default: {
  const _exhaustive: never = params.tag
  return 'INTERNAL_SERVER_ERROR'
}
```
EOF
)"

echo "=== Creating medium issue (N5) ==="
gh issue create --repo "$REPO" \
  --title "Restrict user.list to admin/dev procedures" \
  --label "priority:medium,plan-c" \
  --body "$(cat <<'EOF'
## Context

From Plan C code review finding N5.

**File:** `apps/api/src/trpc/procedures/user.ts:119`

## Problem

The `list` procedure uses `authedProcedure`, meaning any logged-in user can see the full user list. In most applications, listing all users is an admin function.

## Fix

Change to `adminProcedure` or `devProcedure` for the list endpoint, or add pagination and filtering to limit data exposure. Consider what Plan D frontend needs -- if only admins see the user list, use `adminProcedure`.
EOF
)"

echo "=== Creating medium issue (N6) ==="
gh issue create --repo "$REPO" \
  --title "Add foreign key references to Better Auth tables" \
  --label "priority:medium,plan-c" \
  --body "$(cat <<'EOF'
## Context

From Plan C code review finding N6.

**File:** `packages/schema/src/entities/auth.ts:27,44`

## Problem

The `session.userId` and `account.userId` columns do not have `.references(() => User.id)` in the Drizzle schema. While Better Auth manages referential integrity at the application level, database-level foreign keys provide an additional safety net and enable cascade deletes.

## Fix

Add references:

```typescript
userId: text('user_id')
  .notNull()
  .references(() => User.id, { onDelete: 'cascade' }),
```

Note: This will require a new migration. Verify that existing data (if any) satisfies the constraint before applying.
EOF
)"

echo ""
echo "=== All issues created ==="
echo "Summary:"
echo "  1 blocker (I5): Impersonation audit"
echo "  7 medium (I3, I4, N1, N3, N4, N5, N6)"
echo ""
echo "Skipped (already tracked or trivial):"
echo "  D2: Already fixed in de48169"
echo "  D3: Already issue #50"
echo "  D4: Intentional (user registration)"
echo "  I2: Already issue #51"
echo "  N2: Acceptable test convention"
