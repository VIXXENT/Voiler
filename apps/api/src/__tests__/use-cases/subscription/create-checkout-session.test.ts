import type {
  AppError,
  CheckoutSessionResult,
  IBillingService,
  IUserSubscriptionRepository,
} from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { errAsync, okAsync } from 'neverthrow'
import { describe, expect, it, vi } from 'vitest'

import { createCreateCheckoutSession } from '../../../use-cases/subscription/create-checkout-session'

/** Builds a mock IBillingService with vi.fn() stubs. */
const makeMockBilling = (): IBillingService => ({
  createCheckoutSession: vi.fn(),
  cancelSubscription: vi.fn(),
  getPortalUrl: vi.fn(),
})

/** Builds a mock IUserSubscriptionRepository with vi.fn() stubs. */
const makeMockRepo = (): IUserSubscriptionRepository => ({
  findByUser: vi.fn(),
  upsert: vi.fn(),
  updateStatus: vi.fn(),
  updateStripeData: vi.fn(),
})

describe('createCheckoutSession use case', () => {
  it('calls billingService and returns checkout URL', async () => {
    const fakeResult: CheckoutSessionResult = { url: 'https://checkout.stripe.com/pay/session_abc' }
    const billing = makeMockBilling()
    const repo = makeMockRepo()
    vi.mocked(billing.createCheckoutSession).mockReturnValue(okAsync(fakeResult))

    const useCase = createCreateCheckoutSession({
      subscriptionRepository: repo,
      billingService: billing,
    })
    const result = await useCase({
      userId: 'user-1',
      plan: 'pro',
      successUrl: 'https://app.com/success',
      cancelUrl: 'https://app.com/cancel',
    })

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value.url).toBe('https://checkout.stripe.com/pay/session_abc')
    }
    expect(billing.createCheckoutSession).toHaveBeenCalledOnce()
  })

  it('returns Err when billing service fails', async () => {
    const billing = makeMockBilling()
    const repo = makeMockRepo()
    const billingError: AppError = infrastructureError({ message: 'stripe error' })
    vi.mocked(billing.createCheckoutSession).mockReturnValue(errAsync(billingError))

    const useCase = createCreateCheckoutSession({
      subscriptionRepository: repo,
      billingService: billing,
    })
    const result = await useCase({
      userId: 'user-1',
      plan: 'pro',
      successUrl: 'https://app.com/success',
      cancelUrl: 'https://app.com/cancel',
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error.tag).toBe('InfrastructureError')
    }
  })
})
