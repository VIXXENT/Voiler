import type {
  AppError,
  IBillingService,
  IProjectRepository,
  IUserSubscriptionRepository,
} from '@voiler/core'
import { okAsync, ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the cancelSubscription use case.
 */
interface CancelSubscriptionDeps {
  readonly subscriptionRepository: IUserSubscriptionRepository
  readonly billingService: IBillingService
  readonly projectRepository: IProjectRepository
}

/**
 * Parameters for cancelling a user subscription.
 */
interface CancelSubscriptionParams {
  readonly userId: string
}

interface FreezeParams {
  readonly projectRepository: IProjectRepository
  readonly userId: string
}

/** Freezes all projects owned by a user. */
const freezeUserProjects = ({
  projectRepository,
  userId,
}: FreezeParams): ResultAsync<void, AppError> =>
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
  const { subscriptionRepository, billingService, projectRepository } = deps
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
      .andThen(() => freezeUserProjects({ projectRepository, userId }))
  })
}
