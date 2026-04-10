# M3: Subscriptions + Plan Limits + Stripe Test Mode + Freeze

## Goal

Add subscription plans with hard limits enforced at the use-case level. Integrate Stripe in test mode (sk*test*\*). Implement freeze/unfreeze logic when subscriptions lapse.

## Plans

Defined in code (not DB enum) in `packages/domain/src/plans/plan-definitions.ts`:

```typescript
export type PlanId = 'free' | 'pro'

export interface PlanLimits {
  readonly maxProjects: number // -1 = unlimited
  readonly maxMembersPerProject: number
  readonly maxTasksPerProject: number
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { maxProjects: 3, maxMembersPerProject: 5, maxTasksPerProject: 50 },
  pro: { maxProjects: -1, maxMembersPerProject: -1, maxTasksPerProject: -1 },
}
```

## New Table

**`user_subscription`** — `packages/schema/src/entities/user-subscription.ts`

- `id`: text PK
- `userId`: text notNull unique (one subscription per user)
- `plan`: text notNull default 'free' ('free' | 'pro')
- `status`: text notNull default 'active' ('active' | 'canceled' | 'past_due')
- `stripeCustomerId`: text nullable
- `stripeSubscriptionId`: text nullable
- `currentPeriodEnd`: timestamp nullable
- `createdAt`: timestamp notNull
- `updatedAt`: timestamp notNull

## New Domain Errors

```
| { readonly tag: 'ProjectLimitReached'; readonly message: string }
| { readonly tag: 'MemberLimitReached'; readonly message: string }
| { readonly tag: 'TaskLimitReached'; readonly message: string }
| { readonly tag: 'ProjectFrozen'; readonly message: string }
| { readonly tag: 'SubscriptionNotFound'; readonly message: string }
```

Factory functions in `packages/domain/src/errors/subscription-errors.ts`.

## Domain Validation

`packages/domain/src/validation/plan-validation.ts`:

- `checkProjectLimit({ currentCount, plan }): Result<void, DomainError>` — tag: ProjectLimitReached
- `checkMemberLimit({ currentCount, plan }): Result<void, DomainError>` — tag: MemberLimitReached
- `checkTaskLimit({ currentCount, plan }): Result<void, DomainError>` — tag: TaskLimitReached
- `checkNotFrozen({ frozen }): Result<void, DomainError>` — tag: ProjectFrozen

## Port Interfaces

`packages/core/src/repositories/user-subscription.repository.ts`:

- `IUserSubscriptionRepository`: findByUser, upsert, updateStatus, updateStripeData

`packages/core/src/services/billing.service.ts`:

- `IBillingService`: createCheckoutSession, cancelSubscription, getPortalUrl

## Drizzle Adapter

`apps/api/src/adapters/db/drizzle-user-subscription-repository.ts`

## Billing Service (Stub, Test Mode Ready)

`apps/api/src/adapters/billing/stripe-billing-service.ts`

- Uses `STRIPE_SECRET_KEY` from env (if `sk_test_*`, test mode)
- Falls back to stub behavior if key not set
- `createCheckoutSession({ userId, plan })` → returns `{ url: string }`
- `cancelSubscription({ stripeSubscriptionId })` → calls Stripe cancel
- `getPortalUrl({ stripeCustomerId })` → returns portal URL

## Use-Cases

`apps/api/src/use-cases/subscription/`:

- `getSubscription({ userId })` — findByUser or create free default
- `createCheckoutSession({ userId, plan })` — call billingService
- `handleStripeWebhook({ event })` — process: checkout.session.completed → upgrade to pro; subscription.deleted → downgrade to free + freeze projects
- `freezeUserProjects({ userId })` — find all owned projects, set frozen=true
- `unfreezeUserProjects({ userId })` — set frozen=false on all owned projects

## Plan Limit Enforcement

Update these use-cases to inject `subscriptionRepository`:

- `createProject`: getSubscription → checkProjectLimit(count) → proceed
- `inviteToProject`: getSubscription(ownerId) → checkMemberLimit(memberCount) → proceed
- `createTask`: getSubscription(task.createdBy or project ownerId) → checkTaskLimit(taskCount) → proceed
- `createTask` + `inviteToProject` + `createProject`: check `checkNotFrozen({ frozen: project.frozen })`

## Zod Schemas

`packages/schema/src/outputs/public-subscription.ts` — plan, status, currentPeriodEnd
`packages/schema/src/inputs/create-checkout-session.ts` — plan (enum free/pro)

## tRPC Router

`apps/api/src/trpc/procedures/billing.ts`:

- `getSubscription` (query)
- `createCheckoutSession` (mutation, returns { url })
- `cancelSubscription` (mutation)

## Stripe Webhook Endpoint (Hono)

`apps/api/src/http/stripe-webhook.ts` — POST /api/stripe/webhook

- Parse raw body, verify signature (skip verification if STRIPE_WEBHOOK_SECRET not set)
- Route to handleStripeWebhook use-case

## mapErrorCode Updates

- ProjectLimitReached, MemberLimitReached, TaskLimitReached → 'FORBIDDEN'
- ProjectFrozen → 'FORBIDDEN'
- SubscriptionNotFound → 'NOT_FOUND'

## M3 Tasks

- M3-T1: Schema + Zod schemas (user_subscription, outputs, inputs)
- M3-T2: Domain (plan definitions, errors, validation)
- M3-T3: Port interfaces (IUserSubscriptionRepository, IBillingService)
- M3-T4: Drizzle adapter + Stripe billing service stub
- M3-T5: Subscription use-cases + tests
- M3-T6: Plan limit enforcement in M1/M2 use-cases
- M3-T7: tRPC billing router + webhook endpoint + container wiring
