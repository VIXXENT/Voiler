import { okAsync, type ResultAsync } from 'neverthrow'
import type { CheckoutSession, CreateCheckoutParams, PaymentEvent } from './types.js'

/** Application error shape used across the domain. */
type AppError = { readonly tag: string; readonly message: string }

/**
 * Port interface for payment operations.
 * Concrete adapters (Stripe, stub) must satisfy this contract.
 */
export interface IPaymentService {
  /**
   * Creates a hosted checkout session for the given customer and price.
   * Returns a URL the user should be redirected to.
   */
  readonly createCheckoutSession: (
    params: CreateCheckoutParams,
  ) => ResultAsync<CheckoutSession, AppError>

  /**
   * Processes an inbound webhook event from the payment provider.
   * Idempotent — safe to call multiple times for the same event.
   */
  readonly handleWebhookEvent: (params: {
    readonly event: PaymentEvent
  }) => ResultAsync<void, AppError>
}

/**
 * Creates a stub payment service that returns dummy data.
 * Use during development and testing before Stripe credentials are configured.
 */
export const createStubPaymentService = (): IPaymentService => {
  const createCheckoutSession = (params: CreateCheckoutParams) => {
    console.warn(
      `[PAYMENTS STUB] createCheckoutSession — customer: ${params.customerId} price: ${params.priceId}`,
    )
    return okAsync<CheckoutSession, AppError>({
      sessionId: `stub_session_${Date.now()}`,
      url: `https://stub.stripe.com/pay/stub_session_${Date.now()}`,
      customerId: params.customerId,
      priceId: params.priceId,
      status: 'pending',
    })
  }

  const handleWebhookEvent = ({ event }: { readonly event: PaymentEvent }) => {
    console.warn(`[PAYMENTS STUB] handleWebhookEvent — type: ${event.type} id: ${event.eventId}`)
    return okAsync<void, AppError>(undefined)
  }

  return { createCheckoutSession, handleWebhookEvent }
}
