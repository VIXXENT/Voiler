import type { AppError, IUserSubscriptionRepository, SubscriptionRecord } from '@voiler/core'
import { type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the getSubscription use case.
 */
interface GetSubscriptionDeps {
  readonly subscriptionRepository: IUserSubscriptionRepository
}

/**
 * Parameters for retrieving a user subscription.
 */
interface GetSubscriptionParams {
  readonly userId: string
}

/**
 * Factory that builds a use case for retrieving a user's subscription.
 *
 * Returns the existing subscription record if found, or a default
 * free-plan subscription if no record exists in the database.
 */
export const createGetSubscription: (
  deps: GetSubscriptionDeps,
) => (params: GetSubscriptionParams) => ResultAsync<SubscriptionRecord, AppError> =
  (deps) => (params) => {
    const { subscriptionRepository } = deps
    const { userId } = params

    return subscriptionRepository.findByUser({ userId }).map((subscription) => {
      if (subscription !== null) {
        return subscription
      }

      const defaultSubscription: SubscriptionRecord = {
        id: '',
        userId,
        plan: 'free',
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      }
      return defaultSubscription
    })
  }
