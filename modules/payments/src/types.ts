/**
 * Domain types for the payments module.
 * No infrastructure dependencies — pure interfaces only.
 */

/** Parameters required to create a Stripe checkout session. */
export interface CreateCheckoutParams {
  readonly customerId: string
  readonly priceId: string
  readonly successUrl: string
  readonly cancelUrl: string
  readonly metadata?: Readonly<Record<string, string>>
}

/** Represents a created checkout session returned by the payment provider. */
export interface CheckoutSession {
  readonly sessionId: string
  readonly url: string
  readonly customerId: string
  readonly priceId: string
  readonly status: 'pending' | 'complete' | 'expired'
}

/** Represents an inbound payment lifecycle event (e.g. from a webhook). */
export interface PaymentEvent {
  readonly eventId: string
  readonly type: 'checkout.completed' | 'payment.failed' | 'subscription.updated'
  readonly customerId: string
  readonly payload: Readonly<Record<string, unknown>>
  readonly occurredAt: Date
}
