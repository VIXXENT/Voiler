# Plan E-Modules Code Review

**Reviewer:** Claude Opus 4.6 (code review agent)
**Date:** 2026-04-02
**Commits:** `5139a24`, `88ea184`, `54d863b`
**Branch:** feat/plan-a-foundation (merged to main)

---

## Summary

The implementation delivers three things: optional module scaffolds
(payments, email), code markers in existing files, and an interactive
init script that renames the project scope and activates/removes modules.
The module stubs are clean and well-structured. The marker system is
consistent. The init script has two day-zero bugs and several important
issues detailed below.

---

## What Was Done Well

- **Marker format is 100% consistent.** Every marker in `.ts` files uses
  `// [MODULE:name] ` and every marker in `.env.example` uses
  `# [MODULE:name] `. The init script handles both prefixes.
- **Module stubs follow hexagonal architecture.** Domain types have zero
  infrastructure imports, service files define port interfaces, and
  barrel exports are correct.
- **neverthrow usage is proper.** `ResultAsync` return types, `okAsync`
  for stubs, typed `AppError` shape.
- **Init script safety.** All `rmSync` calls are guarded by `existsSync`
  checks. No unguarded `rm -rf /` scenarios.
- **Rename is scoped well.** Three distinct patterns (`@voiler/`,
  `"voiler"`, `voiler-`) cover package names, root package.json name,
  and Docker container names respectively.

---

## Findings

### [day-zero] `.env.example` markers will never be processed

**File:** `scripts/create-project.ts` (lines 10-20, 136-139)

The `TARGET_EXTENSIONS` list does not include files without a standard
extension. `.env.example` has the "extension" `.example`, which is not
in the list. `TARGET_FILENAMES` only contains `Dockerfile`.

This means when the user runs `pnpm init-project`, the `# [MODULE:*]`
markers in `.env.example` will be **silently ignored** -- neither
activated nor removed. The file will ship with commented-out markers
that look like broken comments.

**Fix:** Add `.env.example` to `TARGET_FILENAMES`:

```ts
const TARGET_FILENAMES: ReadonlyArray<string> = ['Dockerfile', '.env.example']
```

---

### [day-zero] tRPC procedures use `throw new Error` instead of `TRPCError`

**Files:**

- `apps/api/src/trpc/procedures/payments.ts` (lines 30, 52)
- `apps/api/src/trpc/procedures/email.ts` (line 30)

The existing procedures (`user.ts`, `session.ts`, `admin.ts`) all use
`TRPCError` with proper error codes (`NOT_FOUND`, `INTERNAL_SERVER_ERROR`,
etc.). The new module procedures use bare `throw new Error(error.message)`,
which:

1. Returns a generic 500 to the client with no structured error code.
2. Breaks the established pattern visible in `user.ts` which has a
   `mapErrorCode` helper that maps `AppError` tags to tRPC codes.
3. Leaks raw error messages to the client without filtering
   infrastructure errors (the existing `throwTrpcError` in `user.ts`
   redacts `InfrastructureError` messages).

**Fix:** Import `TRPCError` and use the same `mapErrorCode` /
`throwTrpcError` pattern, or at minimum:

```ts
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: error.message,
})
```

---

### [important] `AppError` type is duplicated in module services

**Files:**

- `modules/payments/src/service.ts` (line 5)
- `modules/email/src/service.ts` (line 5)

Both modules define their own local `AppError` type:

```ts
type AppError = { readonly tag: string; readonly message: string }
```

But `@voiler/core` already exports `AppError` (it is imported in
`apps/api/src/container.ts` line 1). The module `package.json` files
already depend on `@voiler/core`. These local types should import from
`@voiler/core` instead to stay in sync if the canonical type evolves
(e.g., adding a `cause` field).

**Fix:** Replace the local type with:

```ts
import type { AppError } from '@voiler/core'
```

---

### [important] Webhook endpoint is a tRPC mutation on `publicProcedure`

**File:** `apps/api/src/trpc/procedures/payments.ts` (lines 35-55)

Stripe webhooks are typically received as raw HTTP POST requests with a
signature header (`stripe-signature`). Exposing this as a tRPC mutation
on a `publicProcedure` has two problems:

1. **No signature verification.** Anyone can POST fake events. Real
   Stripe integration requires `stripe.webhooks.constructEvent()` with
   the raw body and signature header.
2. **tRPC expects JSON.** Stripe sends `application/json` but the raw
   body is needed for signature verification. tRPC's input parsing
   strips the raw body.

This is a stub, so it is not immediately dangerous, but the API shape
sets a misleading precedent. Consider adding a `// TODO:` comment
noting that the real implementation should be a raw Hono route, not a
tRPC procedure.

---

### [important] `cleanPackageJson` does not use the `scope` parameter

**File:** `scripts/create-project.ts` (lines 159-181)

The function signature accepts `{ scope }` but never references `scope`
in its body. The parameter type and destructuring add dead code. This is
likely a leftover from a version that renamed the root package name
inside this function.

Note: The root `package.json` `"name": "voiler"` IS renamed by the
`replaceInFile` pass (the `"voiler"` -> `"${scopeWithoutAt}"` pattern on
line 232), so the rename works -- it just does not happen inside
`cleanPackageJson`.

**Fix:** Remove the unused parameter:

```ts
const cleanPackageJson = (): void => {
```

---

### [note] `pnpm-lock.yaml` is not in `SKIP_DIRS` or excluded

The lock file matches `.yaml` in `TARGET_EXTENSIONS`. The rename pass
will scan and modify `pnpm-lock.yaml`, which is a 1000+ line file with
`@voiler/` references (confirmed at lines 62-65 of `pnpm-lock.yaml`).
This is technically correct -- the lock file needs renaming too -- but
`pnpm install` runs immediately after (line 332), which regenerates the
lock file anyway. Processing it is wasted work and carries a small risk
of corruption if the replacement hits an integrity hash that happens to
contain `@voiler/`.

**Suggestion:** Add `pnpm-lock.yaml` to a skip list, or delete it
before the `pnpm install` step.

---

### [note] `docker-compose.yml` PostgreSQL credentials stay as `voiler`

The `voiler-` rename pattern converts `voiler-db` to `myapp-db` (good),
and `@voiler/` handles package filter commands. But the PostgreSQL
credentials (`POSTGRES_USER: voiler`, `POSTGRES_PASSWORD: voiler_dev`,
`POSTGRES_DB: voiler_dev`) and the `DATABASE_URL` connection string
`voiler:voiler_dev@localhost` will remain unchanged.

This is cosmetically inconsistent but not functionally broken -- the DB
credentials are local dev values. Mentioning it so the team can decide
whether to add a fourth rename pattern or leave it.

---

### [note] Init script deletes `docs/reviews/` and `docs/superpowers/`

**File:** `scripts/create-project.ts` (lines 295-305)

This is intentional cleanup of boilerplate docs. Just confirming
awareness: this review file itself will be deleted when init runs. No
action needed.

---

### [note] Module `tsconfig.json` files are missing

Neither `modules/payments/` nor `modules/email/` contain a
`tsconfig.json`. They depend on `@voiler/core` (workspace package) and
use TypeScript syntax. Currently they work because the API app's
`tsconfig.json` likely resolves them, but standalone `tsc --noEmit` on
the module packages will fail. If `turbo typecheck` is scoped to
workspace packages, these modules need their own config.

---

## Verdict

Two day-zero issues must be fixed before this code is used:

1. **`.env.example` not in target files** -- markers will be silently
   skipped.
2. **`throw new Error` instead of `TRPCError`** -- breaks established
   error handling pattern.

The important issues (duplicated `AppError`, unused `scope` param,
webhook design) should be addressed in a follow-up.

Overall the architecture is sound: the marker system is elegant, the
module stubs are properly typed, and the init script logic is correct
apart from the file-targeting gap.
