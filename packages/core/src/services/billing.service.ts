import type { ResultAsync } from 'neverthrow'
import type { PlanId } from '@voiler/domain'

import type { AppError } from '../errors/app-error'

/**
 * Result returned from creating a Stripe checkout session.
 */
export interface CheckoutSessionResult {
  readonly url: string
}

/**
 * Port interface for billing operations.
 *
 * Adapters (e.g. Stripe SDK) implement this contract.
 * The core layer never imports concrete implementations.
 */
export interface IBillingService {
  /** Create a Stripe checkout session for a plan upgrade. */
  createCheckoutSession: (params: {
    userId: string
    plan: PlanId
    successUrl: string
    cancelUrl: string
  }) => ResultAsync<CheckoutSessionResult, AppError>

  /** Cancel an active Stripe subscription. */
  cancelSubscription: (params: {
    stripeSubscriptionId: string
  }) => ResultAsync<void, AppError>

  /** Get the URL for the Stripe customer portal. */
  getPortalUrl: (params: {
    stripeCustomerId: string
    returnUrl: string
  }) => ResultAsync<CheckoutSessionResult, AppError>
}
