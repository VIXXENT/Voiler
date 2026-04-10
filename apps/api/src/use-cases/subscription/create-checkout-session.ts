import type {
  AppError,
  CheckoutSessionResult,
  IBillingService,
  IUserSubscriptionRepository,
} from '@voiler/core'
import { type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the createCheckoutSession use case.
 */
interface CreateCheckoutSessionDeps {
  readonly subscriptionRepository: IUserSubscriptionRepository
  readonly billingService: IBillingService
}

/**
 * Parameters for creating a Stripe checkout session.
 */
interface CreateCheckoutSessionParams {
  readonly userId: string
  readonly plan: 'pro'
  readonly successUrl: string
  readonly cancelUrl: string
}

/**
 * Factory that builds a use case for creating a Stripe checkout session.
 *
 * Delegates entirely to the billing service port, which handles
 * Stripe-specific logic in the infrastructure layer.
 */
export const createCreateCheckoutSession: (
  deps: CreateCheckoutSessionDeps,
) => (params: CreateCheckoutSessionParams) => ResultAsync<CheckoutSessionResult, AppError> =
  (deps) => (params) => {
    const { billingService } = deps
    const { userId, plan, successUrl, cancelUrl } = params

    return billingService.createCheckoutSession({ userId, plan, successUrl, cancelUrl })
  }
