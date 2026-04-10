import type { IBillingService } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'

/**
 * Create a Stripe billing service adapter.
 *
 * Returns stub responses in development (no STRIPE_SECRET_KEY set).
 * Extend with real Stripe SDK calls when credentials are available.
 */
const createStripeBillingService: () => IBillingService = () => {
  const hasStripeKey = Boolean(process.env.STRIPE_SECRET_KEY)

  const createCheckoutSession: IBillingService['createCheckoutSession'] = (params) => {
    if (!hasStripeKey) {
      return okAsync({
        url: `https://checkout.stripe.com/test/stub?plan=${params.plan}&userId=${params.userId}`,
      })
    }
    // TODO: implement real Stripe checkout when STRIPE_SECRET_KEY is available
    return errAsync(infrastructureError({ message: 'Stripe integration not yet implemented' }))
  }

  const cancelSubscription: IBillingService['cancelSubscription'] = (_params) => {
    if (!hasStripeKey) {
      return okAsync(undefined)
    }
    return errAsync(infrastructureError({ message: 'Stripe integration not yet implemented' }))
  }

  const getPortalUrl: IBillingService['getPortalUrl'] = (params) => {
    if (!hasStripeKey) {
      return okAsync({
        url: `https://billing.stripe.com/test/stub?customer=${params.stripeCustomerId}`,
      })
    }
    return errAsync(infrastructureError({ message: 'Stripe integration not yet implemented' }))
  }

  return { createCheckoutSession, cancelSubscription, getPortalUrl }
}

export { createStripeBillingService }
