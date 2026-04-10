# PR #114 Strict Review -- TaskForge SaaS (feat/taskforge -> main)

**Reviewer:** Claude Opus 4.6 (automated strict review)
**Date:** 2026-04-10
**Branch:** `feat/taskforge`
**Commit:** `c463b47`

## Verification Results

| Check                                 | Result                     |
| ------------------------------------- | -------------------------- |
| `pnpm --filter @voiler/api lint`      | PASS (0 errors)            |
| `pnpm --filter @voiler/api typecheck` | PASS (0 errors)            |
| `pnpm --filter @voiler/web typecheck` | PASS (0 errors)            |
| `pnpm --filter @voiler/api test`      | PASS (26 files, 141 tests) |
| `pnpm --filter @voiler/domain lint`   | PASS (0 errors)            |
| `pnpm format:check`                   | PASS (0 warnings)          |

---

## Issues Found

### 1. SECURITY: Stripe Webhook Has No Signature Verification

**File:** `apps/api/src/http/stripe-webhook.ts:40-46`

When `STRIPE_WEBHOOK_SECRET` is set, the handler returns 501 (not implemented). When it is NOT set, it proceeds with zero verification. Any attacker who can reach `/api/stripe/webhook` can send a forged `checkout.session.completed` event with arbitrary `metadata.userId`, upgrading any user to pro for free. The TODO on line 43 is not acceptable for a merge to main.

### 2. SECURITY: CSRF Middleware Will Block Stripe Webhooks in Production

**File:** `apps/api/src/index.ts:117` and `apps/api/src/index.ts:222-225`

The CSRF middleware is registered at line 117 with `app.use('*', ...)` and the webhook route is registered at line 222. Since Hono applies middleware in registration order and `'*'` matches all paths, every POST to `/api/stripe/webhook` is checked for a valid Origin header. Stripe servers will not send the app's origin, so this will fail in production. The webhook route must be registered before the CSRF middleware or explicitly excluded.

### 3. SECURITY: Webhook Ignores the `plan` Metadata and Hardcodes `'pro'`

**File:** `apps/api/src/use-cases/subscription/handle-stripe-webhook.ts:52-63`

The use case extracts `plan` from metadata (line 52) and checks it is not null (line 54), but then ignores it entirely and hardcodes `plan: 'pro'` on line 63. If additional plans are added in the future, the webhook will silently force every checkout to pro. The extracted `plan` should be validated against known plan IDs and used in the upsert.

### 4. BUSINESS LOGIC: `deleteWithCascade` Does Not Delete ProjectMembers

**File:** `apps/api/src/adapters/db/drizzle-project-repository.ts:135-151`

The cascade delete transaction deletes TaskAssignees, Tasks, and the Project, but does NOT delete ProjectMember rows. While the `project_member` table has an `ON DELETE CASCADE` FK on `projectId`, this relies on the DB constraint rather than explicit deletion. If the DB constraint is ever removed or the FK is not properly applied (e.g., during schema push vs. migration), orphaned rows will remain. More importantly, the code suggests the developer was unaware of the membership table when writing this cascade.

### 5. BUSINESS LOGIC: `listUserProjects` Only Returns Owned Projects

**File:** `apps/api/src/use-cases/project/list-user-projects.ts:30`

After M2 added memberships, users can be members of projects they do not own. However, `listUserProjects` only calls `projectRepository.findByOwner({ ownerId: userId })`. Users invited to a project as member or viewer have no way to discover those projects in the UI. This is a functional gap.

### 6. BUSINESS LOGIC: `transferOwnership` is Not Atomic

**File:** `apps/api/src/use-cases/project/transfer-ownership.ts:34-37`

The JSDoc explicitly acknowledges the 3-step mutation (removeMember, addMember, update project) is NOT atomic. A failure mid-chain (e.g., after removing the old member but before updating ownerId) leaves the project in an inconsistent state with no owner membership. This is documented as "tracked as a future improvement" but represents a data corruption risk.

### 7. BUSINESS LOGIC: `transferOwnership` Does Not Check for Existing Old-Owner Membership

**File:** `apps/api/src/use-cases/project/transfer-ownership.ts:67-74`

After the transfer, the use case calls `addMember` for the old owner without checking if they already have a membership row. In an edge case (e.g., partial failure retry), this would hit the DB unique constraint and produce an opaque infrastructure error instead of a clean domain error.

### 8. BUSINESS LOGIC: `createProject` Does Not Create Owner Membership Row

**File:** `apps/api/src/use-cases/project/create-project.ts`

The use case creates a project and sets `ownerId`, but does not insert a corresponding `project_member` row for the owner. While `resolveProjectRole` handles the owner via the `ownerId` field comparison, this means the owner is invisible in `listProjectMembers` results and the member count will be off by one. The owner is a "ghost member" of their own project.

### 9. BUSINESS LOGIC: `cancelSubscription` Silently No-ops When No Subscription Exists

**File:** `apps/api/src/use-cases/subscription/cancel-subscription.ts:33`

When `findByUser` returns null, the use case returns `okAsync(undefined)` -- a silent no-op. The tRPC procedure likely expects a success response, but the user gets no feedback that there was nothing to cancel. This should either return a domain error or the billing procedure should handle the null case explicitly.

### 10. PERFORMANCE: N+1 Query in `freezeUserProjects` and `unfreezeUserProjects`

**File:** `apps/api/src/use-cases/subscription/freeze-user-projects.ts:36-39`
**File:** `apps/api/src/use-cases/subscription/unfreeze-user-projects.ts:36-39`

Both use cases fetch all projects via `findByOwner`, then issue individual `update` calls for each project via `ResultAsync.combine(projects.map(...))`. A user with 50 projects triggers 51 queries (1 SELECT + 50 UPDATEs). This should be a single `UPDATE ... WHERE owner_id = ?` query via a dedicated repository method like `freezeByOwner`.

### 11. TYPE SAFETY: Extensive `@ts-expect-error` and `@ts-ignore` Suppression (30+ occurrences)

**Files:** Multiple frontend route files

All suppressions cite "cross-package tRPC collision." Key locations:

- `apps/web/src/routes/_app/projects/$projectId/index.tsx` -- 6x `@ts-ignore`
- `apps/web/src/routes/_app/settings/billing.tsx` -- 4x `@ts-expect-error`
- `apps/web/src/routes/_app/projects/$projectId/settings.tsx` -- `@ts-ignore`
- `apps/web/src/routes/_app/projects/$projectId/members.tsx` -- `@ts-ignore`
- `apps/web/src/routes/__root.tsx` -- 2x `@ts-expect-error`
- `apps/web/src/lib/trpc.ts` -- 1x `@ts-expect-error`
- `apps/web/src/routes/admin/users.tsx` -- 1x `@ts-expect-error`

These are scattered across every route file. A thin typed wrapper around tRPC hooks in `apps/web/src/lib/` would centralize the suppression to one file.

### 12. TYPE SAFETY: `as` Casting in Production Code

**Files:** Multiple frontend files

The project mandates forbid `as` casting outside tests. Found in production code:

- `apps/web/src/lib/auth.ts:32` -- `(APP_ROLES as readonly string[]).includes(raw) ? (raw as AppRole)`
- `apps/web/src/routes/settings/sessions.tsx:30` -- `(result.data as SessionEntry[] | null)`
- `apps/web/src/routes/_app/settings/billing.tsx:49` -- `const session = result as Record<string, unknown>`
- `apps/web/src/routes/_app/settings/billing.tsx:81` -- `(createCheckoutSession as Record<string, unknown>)['isPending']`
- `apps/web/src/routes/_app/settings/billing.tsx:86` -- `(cancelSubscription as Record<string, unknown>)['isPending']`
- `apps/web/src/routes/_app/projects/index.tsx` -- `(value as Record<string, unknown>)['id']` (type guard, 2x)
- `apps/web/src/routes/admin/users.tsx:23-26` -- `(value as AdminUserRow).id` (type guard, 4x)

The type guard usages are debatable (they narrow correctly), but the billing page casts and the sessions page cast are genuine violations. The `as Record<string, unknown>` pattern in billing is particularly problematic -- it defeats the purpose of type safety.

### 13. TYPE SAFETY: `eslint-disable` Blocks in Frontend Code

**Files:** Multiple frontend route files

Several files use broad `eslint-disable` blocks that suppress `@typescript-eslint/no-unsafe-assignment`, `@typescript-eslint/no-unsafe-call`, and `@typescript-eslint/no-unsafe-member-access`. These disable critical type safety checks across significant code blocks rather than individual lines. Found in:

- `apps/web/src/routes/_app/projects/$projectId/index.tsx`
- `apps/web/src/routes/_app/settings/billing.tsx`
- `apps/web/src/routes/admin/users.tsx`
- `apps/web/src/components/UserList.tsx`

### 14. CODE STANDARDS: `try-catch` in HTTP Boundary Handler

**File:** `apps/api/src/http/stripe-webhook.ts:54-58`

```
try {
  parsed = JSON.parse(body)
} catch {
  return c.json({ error: 'Invalid JSON' }, 400)
}
```

The project mandates forbid `try-catch`. While this is an HTTP boundary (not business logic), it should use a `safeJsonParse` utility returning `Result` for consistency with the neverthrow style used everywhere else.

### 15. CODE STANDARDS: `throw` Used in tRPC Procedures and Context

**Files:**

- `apps/api/src/trpc/context.ts:81,103,121`
- `apps/api/src/trpc/procedures/session.ts:63,84,91,93,107,116,118,133,148`
- `apps/api/src/trpc/procedures/user.ts:102,135`
- `apps/api/src/trpc/procedures/admin.ts:50,62,90`
- `apps/api/src/trpc/procedures/payments.ts:31,57`

These are at the tRPC boundary where `throw new TRPCError` is the framework-mandated pattern for returning errors to clients. This is an acceptable boundary exception, but `payments.ts:31,57` is notable because it throws `new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })` which may leak internal error details to the client. The other procedures sanitize infrastructure errors properly.

### 16. CODE STANDARDS: Branded Type `as` Casting in Domain Value Objects

**Files:**

- `packages/domain/src/value-objects/password.ts:48` -- `value as Password`
- `packages/domain/src/value-objects/user-id.ts:31` -- `value as UserId`
- `packages/domain/src/value-objects/email.ts:36` -- `trimmed as Email`

These are the standard TypeScript branded type pattern. The `as` cast is the only way to create branded types in TS. This is acceptable but should be documented as an explicit exception in coding standards.

### 17. SCHEMA: No FK Constraint on `Project.ownerId` or `UserSubscription.userId`

**Files:**

- `packages/schema/src/entities/project.ts:19` -- `ownerId: text('owner_id').notNull()` (no `.references()`)
- `packages/schema/src/entities/user-subscription.ts:16` -- `userId: text('user_id').notNull().unique()` (no `.references()`)

Both columns reference users but lack FK constraints. The Project entity JSDoc on line 10 explicitly says "no FK constraint yet -- will be added." Without FK constraints, orphaned records can accumulate if users are deleted.

### 18. SCHEMA: `plan` and `status` Columns Use Unconstrained `text()` Type

**File:** `packages/schema/src/entities/user-subscription.ts:17-18`

```
plan: text('plan').notNull().default('free'),
status: text('status').notNull().default('active'),
```

These should be constrained at the DB level. Currently any string can be inserted. The Zod insert schema may validate on the application side, but direct DB queries (admin tools, migrations) can insert invalid values.

### 19. TEST COVERAGE: No Unit Tests for Permission Paths in M1-Upgraded Use Cases

**Files:** Test directories under `apps/api/src/__tests__/use-cases/`

The task use cases (`create-task`, `update-task`, `transition-task-status`, `delete-task`, `assign-to-task`, `unassign-from-task`, `list-project-tasks`) and `get-project` were upgraded with permission checks in M2, but it is unclear from the test file count whether all permission paths (owner/member/viewer/non-member) are exercised. The tests pass (141/141), but the permission check coverage for the matrix of roles x actions should be verified.

### 20. TEST COVERAGE: No Unit Tests for `handle-stripe-webhook` Use Case

**File:** `apps/api/src/use-cases/subscription/handle-stripe-webhook.ts`

No test file found at `apps/api/src/__tests__/use-cases/subscription/handle-stripe-webhook.test.ts`. The webhook handler routes by event type and extracts nested metadata -- this is complex parsing logic that should be tested for:

- Valid `checkout.session.completed` with good metadata
- Valid `customer.subscription.deleted` with good metadata
- Missing or null metadata fields (silent no-op behavior)
- Unknown event types (no-op)
- Malformed `data.object` shapes

### 21. TEST COVERAGE: No Unit Tests for `cancel-subscription` Freeze Side Effect

**File:** `apps/api/src/use-cases/subscription/cancel-subscription.ts`

The cancel-subscription test file exists but should verify that `freezeUserProjects` is called after status update. The freeze side effect is a critical business invariant -- if the order is wrong (freeze before status update), a crash could leave projects frozen with an active subscription.

### 22. TEST COVERAGE: E2E Global Setup Has Hardcoded Credentials

**File:** `apps/web/e2e/setup/global-setup.ts:11-12`

```
await page.getByRole('textbox', { name: /email/i }).fill('test@taskforge.e2e')
await page.getByLabel(/password/i).fill('TestPassword123!')
```

Credentials are hardcoded. These should come from environment variables (e.g., `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`) to avoid committing credentials and to allow CI customization.

### 23. TEST COVERAGE: E2E Global Setup Has Fragile Registration Fallback Logic

**File:** `apps/web/e2e/setup/global-setup.ts:16-21`

The setup checks the current URL to determine if registration succeeded:

```
const url = page.url()
if (!url.includes('/projects')) {
  await page.goto('http://localhost:3000/auth/login')
```

This is fragile -- if the register page redirects to a different success URL, or if registration fails for a reason other than "account exists" (e.g., validation error, server error), the test will attempt login with potentially wrong credentials and produce confusing failures.

### 24. FRONTEND: Projects Page Uses `as Record<string, unknown>` in Type Guards

**File:** `apps/web/src/routes/_app/projects/index.tsx`

The `isProjectRow` type guard uses `(value as Record<string, unknown>)['id']` pattern. While this is a common type-narrowing pattern, it violates the `as` casting prohibition. The guard could use `typeof value === 'object' && value !== null && 'id' in value` instead.

### 25. FRONTEND: Project Detail Page Has 394 Lines

**File:** `apps/web/src/routes/_app/projects/$projectId/index.tsx` (394 lines)

This file handles tasks list, task creation dialog, task status transitions, task deletion, and task assignment -- all in one route component. This should be decomposed into smaller components (TaskList, CreateTaskDialog, TaskCard, etc.) for maintainability and testability.

### 26. FRONTEND: Billing Page Casts Mutation Objects to Access `isPending`

**File:** `apps/web/src/routes/_app/settings/billing.tsx:81,86`

```
(createCheckoutSession as Record<string, unknown>)['isPending'] === true
(cancelSubscription as Record<string, unknown>)['isPending'] === true
```

This is a particularly unsafe pattern. The tRPC mutation hook's `isPending` property is part of its typed API -- if the type inference worked correctly, no cast would be needed. This is a downstream symptom of the `@ts-expect-error` problem from issue #11.

### 27. FRONTEND: No Error Boundary for tRPC Query Failures

**Files:** All route files using `trpc.*.useQuery`

The route components check `isLoading` and render skeletons, and some check `error` for inline error messages, but there is no `ErrorBoundary` component wrapping the route tree. An unhandled exception in a tRPC hook (e.g., network timeout, JSON parse error) will crash the entire app. TanStack Router supports error boundaries via `errorComponent` on routes.

### 28. ARCHITECTURE: `Sidebar` Has Two Different Versions of Navigation Items

**Observation:** The search results showed two versions of the Sidebar -- one with `{ to: '/settings/billing', label: 'Billing' }` routing to `/settings/sessions` for Settings, and another with `{ to: '/settings/profile', labelKey: 'nav.settings' }`. The current version uses `labelKey` for i18n but the actual Sidebar component imports suggest it uses the Paraglide `m` function to resolve these keys. Verify the current version is internally consistent.

### 29. ARCHITECTURE: `payments.ts` Procedures Leak Internal Error Messages

**File:** `apps/api/src/trpc/procedures/payments.ts:31,57`

```
throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message })
```

Unlike the `user.ts` procedures which sanitize infrastructure errors (replacing with generic messages), the payments procedures pass `error.message` directly. This can leak database error messages, stack traces, or other internal details to the client.

### 30. ARCHITECTURE: Duplicate `isRecord` Type Guard

**Files:**

- `apps/api/src/http/stripe-webhook.ts:16`
- `apps/api/src/use-cases/subscription/handle-stripe-webhook.ts:22`

The same `isRecord` type guard is defined in two files. This should be extracted to a shared utility (e.g., `packages/domain/src/utils/type-guards.ts`).

### 31. ARCHITECTURE: Container File Imports All Use Cases From a Single Barrel

**File:** `apps/api/src/container.ts:22-50`

The container imports all use-case factories in one large import block. While this is the designated "only file that imports concrete adapters," the file will grow linearly with every new feature. Consider organizing use-case imports by domain (project, task, subscription) or using a registration pattern.

### 32. SCHEMA: `Project.status` Column Lacks DB-Level Enum Constraint

**File:** `packages/schema/src/entities/project.ts`

The `status` column is `text('status').notNull().default('active')` with no DB-level constraint. The Zod insert schema validates `z.enum(['active', 'archived'])` on the application side, but direct DB writes can insert any string. Use `pgEnum` for DB-level enforcement.

### 33. SCHEMA: `Task.status` and `Task.priority` Lack DB-Level Enum Constraints

**File:** `packages/schema/src/entities/task.ts` (implied from pattern)

Same issue as Project.status -- these are likely `text()` columns validated only at the Zod layer.

### 34. SECURITY: Webhook Processes Events Without Idempotency Key

**File:** `apps/api/src/use-cases/subscription/handle-stripe-webhook.ts`

Stripe can send the same webhook event multiple times (retries). The handler processes `checkout.session.completed` by upserting the subscription, which is idempotent. However, `customer.subscription.deleted` calls `freezeUserProjects` which iterates and updates each project -- if a partial failure occurs and Stripe retries, some projects may be double-processed. While the freeze operation is technically idempotent (setting frozen=true twice is harmless), the lack of explicit idempotency tracking (e.g., storing processed event IDs) means the system has no way to detect or log duplicate processing.

### 35. SECURITY: No Rate Limiting on Webhook Endpoint

**File:** `apps/api/src/index.ts:222-225`

The webhook route is registered as a plain Hono route. If the rate limiter middleware is applied globally before this route, it would rate-limit legitimate Stripe retries. If it is not applied, the endpoint is open to abuse. The webhook should have its own rate-limiting strategy (e.g., higher limits than user-facing endpoints).

---

## Summary

**Total issues found: 35**

**Breakdown by category:**

| Category                | Count                       |
| ----------------------- | --------------------------- |
| Security                | 5 (#1, #2, #29, #34, #35)   |
| Business Logic          | 5 (#3, #5, #6, #7, #8, #9)  |
| Type Safety             | 3 (#11, #12, #13)           |
| Code Standards          | 3 (#14, #15, #16)           |
| Schema / Data Integrity | 4 (#4, #17, #18, #32, #33)  |
| Test Coverage           | 4 (#19, #20, #21, #22, #23) |
| Frontend                | 4 (#24, #25, #26, #27)      |
| Performance             | 1 (#10)                     |
| Architecture            | 4 (#28, #30, #31)           |

**What was done well:**

- All verification commands pass cleanly (lint, typecheck, tests, format)
- 141 unit tests across 26 files with good coverage of happy and error paths
- Consistent hexagonal architecture -- domain and core layers have zero infrastructure imports
- No semicolons, no `any` types in production code
- JSDoc present on all exported use-case factories
- Proper neverthrow usage throughout business logic layer
- Clean DI container pattern with factory functions
- RBAC permission model is well-designed (owner/member/viewer with action matrix)
- Plan validation domain functions are pure and well-tested
