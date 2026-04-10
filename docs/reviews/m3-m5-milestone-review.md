# M3-M5 Milestone Review

**Reviewer:** Claude Opus 4.6 (Senior Code Reviewer)
**Date:** 2026-04-09
**Branch:** feat/taskforge
**Status:** 26 test files, 140 tests passing. Lint clean.

---

## 1. SECURITY: Stripe Webhook Has No Signature Verification

**File:** `apps/api/src/http/stripe-webhook.ts:36-47`

The webhook handler parses raw JSON and validates the shape, but **never verifies the Stripe-Signature header** using `stripe.webhooks.constructEvent()`. Any attacker who can reach `/api/stripe/webhook` can send a forged `checkout.session.completed` event with arbitrary `metadata.userId` and `metadata.plan`, upgrading any user to pro for free.

Additionally, the CSRF middleware at `apps/api/src/index.ts:117` uses `app.use('*', csrfProtection(...))` which applies to ALL POST routes including the webhook. Stripe cannot send a valid Origin header, so **the webhook will be rejected by CSRF in production** when TRUSTED_ORIGINS is set to a real domain. The webhook route needs to be registered BEFORE the CSRF middleware or excluded from it.

**Required fix:** Add `Stripe-Signature` header verification using the Stripe SDK and a `STRIPE_WEBHOOK_SECRET` env var. Exempt `/api/stripe/webhook` from CSRF.

---

## 2. SECURITY: CSRF Will Block Stripe Webhooks in Production

**File:** `apps/api/src/index.ts:117` and `apps/api/src/index.ts:222-225`

The CSRF middleware is registered at line 117 with `app.use('*', ...)`, and the webhook route is registered at line 222. Since Hono applies middleware in registration order and `'*'` matches all paths, every POST to `/api/stripe/webhook` will be checked for a valid Origin header. Stripe's servers will not send your app's origin, so this will fail.

**Required fix:** Either move the webhook route registration before the CSRF middleware, or add a path exclusion for `/api/stripe/webhook` in the CSRF middleware.

---

## 3. SECURITY: createProject Does Not Check Frozen State

**File:** `apps/api/src/use-cases/project/create-project.ts`

The `createProject` use case checks the project count limit but **never calls `checkNotFrozen`**. While `inviteToProject` (line 62) and `createTask` (line 80) both check frozen state, a user whose subscription lapsed and whose projects are frozen can still create NEW projects up to the free plan limit. This is inconsistent -- frozen should block all mutations.

Note: This is slightly nuanced because `createProject` creates a new project (not modifying a frozen one), and there is no single "frozen" flag on the user. Each project has its own `frozen` field. But a user with a lapsed subscription should arguably not be able to create new projects at all.

**Required fix:** After fetching the subscription, check if the subscription status is `canceled` or `past_due` and block project creation accordingly.

---

## 4. SECURITY: Stub Billing Service Leaks userId in URL

**File:** `apps/api/src/adapters/billing/stripe-billing-service.ts:18`

```
url: `https://checkout.stripe.com/test/stub?plan=${params.plan}&userId=${params.userId}`
```

The stub checkout URL includes the raw `userId` in the query string. While this is dev-only (guarded by `!hasStripeKey`), the URL is returned to the client via the tRPC `createCheckoutSession` procedure and could be logged or leaked. If this stub ever runs in a staging environment shared with external testers, it exposes internal user IDs.

**Suggestion:** Use an opaque token or omit userId from the stub URL.

---

## 5. PLAN LIMITS: Logic Is Correct

**File:** `packages/domain/src/validation/plan-validation.ts`

All four domain validators (`checkProjectLimit`, `checkMemberLimit`, `checkTaskLimit`, `checkNotFrozen`) are correctly implemented. The `-1` sentinel for unlimited is handled first. The use cases correctly resolve the plan from the **project owner's** subscription (not the acting user's), which is the right design for team scenarios.

Free limits: 3 projects, 5 members/project, 50 tasks/project -- all enforced.

---

## 6. FRONTEND AUTH GUARD: Functional But Client-Side Only

**File:** `apps/web/src/routes/_app.tsx:11-15`

The `beforeLoad` hook calls `authClient.getSession()` which is a client-side HTTP call to Better Auth. This correctly redirects to `/auth/login` when no session exists. However:

- The `throw redirect(...)` pattern requires the `eslint-disable` on line 14, which is acceptable for TanStack Router's API design.
- This is a **client-side guard only**. SSR requests will execute `beforeLoad` on the server if using SSR mode, but `authClient` is a client-side construct (`better-auth/react`). Verify that TanStack Start's SSR path also respects this guard or sensitive data could be rendered server-side before the redirect fires on the client.

**Suggestion:** Confirm SSR behavior or add a server-side session check in the SSR path.

---

## 7. FREEZE LOGIC: Correctly Enforced in Mutations

**Files:**

- `apps/api/src/use-cases/project/invite-to-project.ts:62-65` -- checks frozen before invite
- `apps/api/src/use-cases/task/create-task.ts:80-83` -- checks frozen before task creation

Both `inviteToProject` and `createTask` correctly call `checkNotFrozen({ frozen: project.frozen })` and return early on error. The webhook handler correctly freezes/unfreezes all projects owned by a user on subscription changes.

**Gap:** Other mutation use cases (updateTask, transitionTaskStatus, assignToTask, archiveProject, etc.) should also check frozen state. Currently only invite and create-task do.

---

## 8. DATA EXPOSURE: PublicSubscription Is Clean

**File:** `packages/schema/src/outputs/public-subscription.ts`

The `PublicSubscription` type only exposes `plan`, `status`, and `currentPeriodEnd`. No Stripe customer IDs, subscription IDs, or internal fields are leaked. The `mapToPublicSubscription` function in `apps/api/src/trpc/procedures/billing.ts:32-38` correctly maps only these three fields.

---

## 9. CHECKOUT SESSION: No IDOR Risk

**File:** `apps/api/src/trpc/procedures/billing.ts:62-66`

The `createCheckoutSession` procedure uses `opts.ctx.user.id` (from the authenticated session) as the userId, not a client-supplied userId. The client only provides `plan`, `successUrl`, and `cancelUrl`. No IDOR vector exists.

**Minor note:** The `successUrl` and `cancelUrl` are client-controlled strings validated only as URLs by Zod. When real Stripe is integrated, these should be validated against an allowlist of your own domains to prevent open-redirect attacks via Stripe's redirect flow.

---

## 10. TYPE SAFETY: Excessive @ts-expect-error Suppression

**Files:** Multiple route files (20+ occurrences)

All `@ts-expect-error` annotations cite "cross-package tRPC collision." This is a known TanStack + tRPC monorepo issue where the inferred AppRouter type from one package does not perfectly align when consumed in another. While each suppression is documented with a consistent comment, 20+ suppressions is a maintenance risk -- if the underlying type issue is fixed upstream, these will silently become unnecessary (and `@ts-expect-error` will flag them, which is good).

**Suggestion:** Track this as tech debt. Consider creating a thin typed wrapper around the tRPC client hooks in `apps/web/src/lib/` that centralizes the suppression to one file instead of scattering it across every route.

---

## 11. MANDATE VIOLATION: try-catch in stripe-webhook.ts

**File:** `apps/api/src/http/stripe-webhook.ts:39-42`

```typescript
try {
  parsed = JSON.parse(body)
} catch {
  return c.json({ error: 'Invalid JSON' }, 400)
}
```

The project mandates forbid `throw`/`try-catch` for business logic (see `docs/error-handling.md`). This is an HTTP boundary handler parsing external input, which is an acceptable exception to the rule -- JSON.parse is a runtime throw that cannot be avoided without a wrapper. However, consider using a `safeJsonParse` utility that returns a `Result` to keep the handler consistent with the project's neverthrow style.

---

## Summary of Required Actions

| #   | Severity       | Issue                                                                          | File                        |
| --- | -------------- | ------------------------------------------------------------------------------ | --------------------------- |
| 1   | **CRITICAL**   | No Stripe signature verification -- anyone can forge webhook events            | `stripe-webhook.ts`         |
| 2   | **CRITICAL**   | CSRF middleware blocks Stripe webhook POSTs in production                      | `index.ts:117,222`          |
| 3   | **Important**  | createProject does not check frozen/lapsed subscription state                  | `create-project.ts`         |
| 7   | **Important**  | Freeze check missing from updateTask, transitionTaskStatus, assignToTask, etc. | Multiple use-cases          |
| 10  | **Important**  | 20+ @ts-expect-error suppressions should be centralized                        | Route files                 |
| 9   | **Suggestion** | Validate successUrl/cancelUrl against domain allowlist                         | `billing.ts`                |
| 4   | **Suggestion** | Stub billing leaks userId in URL                                               | `stripe-billing-service.ts` |
| 6   | **Suggestion** | Verify SSR auth guard behavior with TanStack Start                             | `_app.tsx`                  |
| 11  | **Suggestion** | Use safeJsonParse Result wrapper in webhook handler                            | `stripe-webhook.ts`         |
