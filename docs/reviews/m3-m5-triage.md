# M3-M5 Milestone Review — Triage

**Triage date:** 2026-04-09
**Reviewer findings source:** `docs/reviews/m3-m5-milestone-review.md`
**Branch:** feat/taskforge

---

## Summary

| #   | Reviewer finding                                     | Classification       | Action                                  |
| --- | ---------------------------------------------------- | -------------------- | --------------------------------------- |
| 1   | No Stripe signature verification                     | **Day-zero / fixed** | Stub added in `stripe-webhook.ts`       |
| 2   | CSRF blocks Stripe webhook POSTs                     | **Day-zero / fixed** | Webhook moved before CSRF in `index.ts` |
| 3   | createProject does not check frozen/lapsed state     | **Medium**           | GitHub issue #110                       |
| 4   | Stub billing leaks userId in URL                     | **Trivial**          | See justification below                 |
| 5   | Plan limits logic is correct                         | **No action**        | Confirmed correct                       |
| 6   | Frontend auth guard is client-side only              | **Trivial**          | See justification below                 |
| 7   | Freeze check missing from other mutations            | **Medium**           | GitHub issue #111                       |
| 8   | PublicSubscription is clean                          | **No action**        | Confirmed correct                       |
| 9   | successUrl/cancelUrl not validated against allowlist | **Trivial**          | See justification below                 |
| 10  | 20+ @ts-expect-error suppressions                    | **Medium**           | GitHub issue #112                       |
| 11  | try-catch in stripe-webhook.ts                       | **Trivial**          | See justification below                 |

---

## Day-zero fixes applied

### Fix 1 — CSRF ordering (`apps/api/src/index.ts`)

The Stripe webhook route was registered at line 222, **after** the `app.use('*', csrfProtection(...))` middleware at line 117. Hono applies middleware in registration order, so every `POST /api/stripe/webhook` from Stripe would have been rejected with a CSRF error because Stripe does not send an Origin header.

**Fix:** Moved `app.post('/api/stripe/webhook', ...)` to run immediately **before** `app.use('*', csrfProtection(...))`. Updated the middleware-order comment in the same block.

### Fix 2 — Signature verification stub (`apps/api/src/http/stripe-webhook.ts`)

The handler accepted any POST without verifying the `Stripe-Signature` header, allowing forged events to upgrade arbitrary users.

**Fix:** Added a guard at the top of the handler:

- If `STRIPE_WEBHOOK_SECRET` env var is set → return `501` with a clear message until SDK verification is wired.
- If `STRIPE_WEBHOOK_SECRET` is not set (test mode) → log a warning and proceed.

This ensures that when real Stripe credentials are added, the handler is safe-by-default (rejects all requests) rather than silently unsafe.

---

## GitHub issues created

| Issue                                                | Title                                                                                        | Labels                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [#110](https://github.com/VIXXENT/Voiler/issues/110) | createProject does not block users with lapsed subscriptions                                 | type:bug, taskforge-finding, priority:medium, epic:backend    |
| [#111](https://github.com/VIXXENT/Voiler/issues/111) | Freeze check missing from updateTask, transitionTaskStatus, assignToTask and other mutations | type:bug, taskforge-finding, priority:medium, epic:backend    |
| [#112](https://github.com/VIXXENT/Voiler/issues/112) | 20+ @ts-expect-error suppressions in tRPC route files should be centralized                  | type:tech-debt, taskforge-finding, priority:low, epic:backend |

---

## Trivial findings — discarded with justification

### Finding 4 — Stub billing leaks userId in URL

**File:** `apps/api/src/adapters/billing/stripe-billing-service.ts`

The stub billing service embeds `userId` as a query parameter in the Stripe success/cancel URLs. This is test-mode only scaffolding with no real credentials. The real Stripe integration will use Stripe-hosted sessions where the redirect URL is validated server-side, and the `userId` will be stored in Stripe `metadata` (not the URL). Discarded: test-mode-only code with no security surface in production.

### Finding 6 — Frontend auth guard is client-side only

**File:** `apps/web/src/routes/_app.tsx`

The auth guard in the route layout runs on the client. TanStack Start supports SSR route guards via `beforeLoad`, which would reject unauthenticated requests server-side. This is a UX/performance improvement but not a security issue: the API enforces auth on every tRPC procedure via the `authedProcedure` guard. The frontend guard is defense-in-depth only. Discarded as a suggestion for a future DX improvement, not a blocker.

### Finding 9 — successUrl/cancelUrl not validated against domain allowlist

**File:** `apps/api/src/trpc/procedures/billing.ts`

The checkout session procedure accepts `successUrl` and `cancelUrl` from the client and passes them to Stripe. This is an open-redirect risk in theory, but Stripe itself validates that redirect URLs match the domains configured in the Stripe Dashboard. In production the Stripe Dashboard domain allowlist is the enforcement mechanism. A defense-in-depth server-side check would be valuable but is not a blocker. Discarded for now; can be added when real Stripe credentials are wired.

### Finding 11 — try-catch in stripe-webhook.ts

**File:** `apps/api/src/http/stripe-webhook.ts:39-42`

`JSON.parse` is a host API that throws; there is no neverthrow-native alternative without writing a `safeJsonParse` wrapper. The project's error-handling mandate explicitly targets business logic, and this is an HTTP boundary parsing external untrusted input — a standard exception to the rule. The reviewer themselves note this is "an acceptable exception." Discarded. A `safeJsonParse` utility would be a minor style improvement, not a violation.

---

## Verification

- `pnpm --filter @voiler/api lint` — **0 errors** (after fixing bracket-notation lint error)
- `pnpm --filter @voiler/api test` — **140/140 passing** (26 test files)
