import type { AppError, IProjectRepository, IUserSubscriptionRepository } from '@voiler/core'
import { okAsync, ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the handleStripeWebhook use case.
 */
interface HandleStripeWebhookDeps {
  readonly subscriptionRepository: IUserSubscriptionRepository
  readonly projectRepository: IProjectRepository
}

/**
 * Parameters for handling an incoming Stripe webhook event.
 */
interface HandleStripeWebhookParams {
  readonly type: string
  readonly data: Record<string, unknown>
}

interface ProjectHelperParams {
  readonly projectRepository: IProjectRepository
  readonly userId: string
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

/** Freezes all projects owned by a user. */
const freezeUserProjects = ({
  projectRepository,
  userId,
}: ProjectHelperParams): ResultAsync<void, AppError> =>
  projectRepository
    .findByOwner({ ownerId: userId })
    .andThen((projects) => {
      if (projects.length === 0) {
        return okAsync([])
      }
      return ResultAsync.combine(
        projects.map((p) =>
          projectRepository.update({ id: p.id, data: { frozen: true, updatedAt: new Date() } }),
        ),
      )
    })
    .map(() => undefined)

/** Unfreezes all projects owned by a user. */
const unfreezeUserProjects = ({
  projectRepository,
  userId,
}: ProjectHelperParams): ResultAsync<void, AppError> =>
  projectRepository
    .findByOwner({ ownerId: userId })
    .andThen((projects) => {
      if (projects.length === 0) {
        return okAsync([])
      }
      return ResultAsync.combine(
        projects.map((p) =>
          projectRepository.update({ id: p.id, data: { frozen: false, updatedAt: new Date() } }),
        ),
      )
    })
    .map(() => undefined)

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
  const { subscriptionRepository, projectRepository } = deps
  const { type, data } = params

  const obj: unknown = data.object

  if (type === 'checkout.session.completed') {
    const metadata: unknown = isRecord(obj) ? obj.metadata : null
    const userId = extractString({ v: metadata, key: 'userId' })
    const plan = extractString({ v: metadata, key: 'plan' })

    if (userId === null || plan === null) {
      return okAsync(undefined)
    }

    return subscriptionRepository
      .upsert({
        userId,
        data: {
          userId,
          plan: 'pro',
          status: 'active',
          updatedAt: new Date(),
        },
      })
      .andThen(() => unfreezeUserProjects({ projectRepository, userId }))
  }

  if (type === 'customer.subscription.deleted') {
    const metadata: unknown = isRecord(obj) ? obj.metadata : null
    const userId = extractString({ v: metadata, key: 'userId' })

    if (userId === null) {
      return okAsync(undefined)
    }

    return subscriptionRepository
      .updateStatus({ userId, status: 'canceled', updatedAt: new Date() })
      .andThen(() => freezeUserProjects({ projectRepository, userId }))
  }

  return okAsync(undefined)
}
