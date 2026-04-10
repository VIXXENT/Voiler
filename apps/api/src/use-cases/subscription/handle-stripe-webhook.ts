import type { AppError, IUserSubscriptionRepository } from '@voiler/core'
import type { PlanId } from '@voiler/domain'
import { okAsync, type ResultAsync } from 'neverthrow'

/** Known plan IDs that can be activated via checkout. */
const VALID_PLAN_IDS: ReadonlySet<string> = new Set<PlanId>(['free', 'pro'])

/**
 * Dependencies injected into the handleStripeWebhook use case.
 */
interface HandleStripeWebhookDeps {
  readonly subscriptionRepository: IUserSubscriptionRepository
  readonly freezeUserProjects: (params: { userId: string }) => ResultAsync<void, AppError>
  readonly unfreezeUserProjects: (params: { userId: string }) => ResultAsync<void, AppError>
}

/**
 * Parameters for handling an incoming Stripe webhook event.
 */
interface HandleStripeWebhookParams {
  readonly type: string
  readonly data: Record<string, unknown>
}

/** Type guard: checks if a value is a non-null object (i.e. Record). */
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** Safely extract a string property from an unknown value. */
const extractString = ({ v, key }: { v: unknown; key: string }): string | null => {
  if (!isRecord(v)) {
    return null
  }
  const val: unknown = v[key]
  return typeof val === 'string' ? val : null
}

/**
 * Factory that builds a use case for handling Stripe webhook events.
 *
 * Routes events by type:
 * - `checkout.session.completed`: upgrades the user to pro and unfreezes projects.
 * - `customer.subscription.deleted`: cancels the subscription and freezes projects.
 * - Any other type: no-op, returns void.
 */
export const createHandleStripeWebhook: (
  deps: HandleStripeWebhookDeps,
) => (params: HandleStripeWebhookParams) => ResultAsync<void, AppError> = (deps) => (params) => {
  const { subscriptionRepository, freezeUserProjects, unfreezeUserProjects } = deps
  const { type, data } = params

  const obj: unknown = data.object

  if (type === 'checkout.session.completed') {
    const metadata: unknown = isRecord(obj) ? obj.metadata : null
    const userId = extractString({ v: metadata, key: 'userId' })
    const planRaw = extractString({ v: metadata, key: 'plan' })

    if (userId === null || planRaw === null || !VALID_PLAN_IDS.has(planRaw)) {
      return okAsync(undefined)
    }

    const plan = planRaw as PlanId

    return subscriptionRepository
      .upsert({
        userId,
        data: {
          userId,
          plan,
          status: 'active',
          updatedAt: new Date(),
        },
      })
      .andThen(() => unfreezeUserProjects({ userId }))
  }

  if (type === 'customer.subscription.deleted') {
    const metadata: unknown = isRecord(obj) ? obj.metadata : null
    const userId = extractString({ v: metadata, key: 'userId' })

    if (userId === null) {
      return okAsync(undefined)
    }

    return subscriptionRepository
      .updateStatus({ userId, status: 'canceled', updatedAt: new Date() })
      .andThen(() => freezeUserProjects({ userId }))
  }

  return okAsync(undefined)
}
