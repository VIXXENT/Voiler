import type { AppError, IBillingService, IUserSubscriptionRepository } from '@voiler/core'
import { okAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the cancelSubscription use case.
 */
interface CancelSubscriptionDeps {
  readonly subscriptionRepository: IUserSubscriptionRepository
  readonly billingService: IBillingService
  readonly freezeUserProjects: (params: { userId: string }) => ResultAsync<void, AppError>
}

/**
 * Parameters for cancelling a user subscription.
 */
interface CancelSubscriptionParams {
  readonly userId: string
}

/**
 * Factory that builds a use case for cancelling a user's subscription.
 *
 * If no subscription exists, returns immediately with no-op.
 * If a Stripe subscription is attached, cancels it via the billing service.
 * Always updates the local status to 'canceled' and freezes the user's projects.
 */
export const createCancelSubscription: (
  deps: CancelSubscriptionDeps,
) => (params: CancelSubscriptionParams) => ResultAsync<void, AppError> = (deps) => (params) => {
  const { subscriptionRepository, billingService, freezeUserProjects } = deps
  const { userId } = params

  return subscriptionRepository.findByUser({ userId }).andThen((subscription) => {
    if (subscription === null) {
      return okAsync(undefined)
    }

    const cancelStripe: ResultAsync<void, AppError> =
      subscription.stripeSubscriptionId !== null
        ? billingService.cancelSubscription({
            stripeSubscriptionId: subscription.stripeSubscriptionId,
          })
        : okAsync(undefined)

    return cancelStripe
      .andThen(() =>
        subscriptionRepository.updateStatus({
          userId,
          status: 'canceled',
          updatedAt: new Date(),
        }),
      )
      .andThen(() => freezeUserProjects({ userId }))
  })
}
