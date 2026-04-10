import type { ResultAsync } from 'neverthrow'
import type { PlanId } from '@voiler/domain'

import type { AppError } from '../errors/app-error'

/**
 * Flat record returned by the subscription persistence adapter.
 * Contains all persisted columns for a user's subscription plan.
 */
export interface SubscriptionRecord {
  readonly id: string
  readonly userId: string
  readonly plan: 'free' | 'pro'
  readonly status: 'active' | 'canceled' | 'past_due'
  readonly stripeCustomerId: string | null
  readonly stripeSubscriptionId: string | null
  readonly currentPeriodEnd: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Data required to create or update a subscription record.
 * `updatedAt` is always required so the adapter stamps the record correctly.
 */
export interface UpsertSubscriptionData {
  readonly userId: string
  readonly plan: PlanId
  readonly status: 'active' | 'canceled' | 'past_due'
  readonly stripeCustomerId?: string | null
  readonly stripeSubscriptionId?: string | null
  readonly currentPeriodEnd?: Date | null
  readonly updatedAt: Date
}

/**
 * Port interface for user subscription persistence.
 *
 * Adapters (e.g. Drizzle) implement this contract.
 * The core layer never imports concrete implementations.
 */
export interface IUserSubscriptionRepository {
  /** Find the subscription for a user. Returns null if no subscription record exists. */
  findByUser: (params: { userId: string }) => ResultAsync<SubscriptionRecord | null, AppError>
  /** Create or update the subscription record for a user. */
  upsert: (params: {
    userId: string
    data: UpsertSubscriptionData
  }) => ResultAsync<SubscriptionRecord, AppError>
  /** Update subscription status only. */
  updateStatus: (params: {
    userId: string
    status: 'active' | 'canceled' | 'past_due'
    updatedAt: Date
  }) => ResultAsync<SubscriptionRecord, AppError>
  /** Update Stripe-specific fields on the subscription. */
  updateStripeData: (params: {
    userId: string
    stripeCustomerId: string
    stripeSubscriptionId: string
    plan: PlanId
    status: 'active' | 'canceled' | 'past_due'
    currentPeriodEnd: Date | null
    updatedAt: Date
  }) => ResultAsync<SubscriptionRecord, AppError>
}
