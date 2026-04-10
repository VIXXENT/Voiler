import type { AppError, CheckoutSessionResult, SubscriptionRecord } from '@voiler/core'
import { CreateCheckoutSessionInputSchema, type PublicSubscription } from '@voiler/schema'
import type { ResultAsync } from 'neverthrow'

import { authedProcedure, router } from '../context.js'

import { throwTrpcError } from './user.js'

/**
 * Dependencies for the billing router factory.
 */
interface CreateBillingRouterParams {
  readonly getSubscription: (params: {
    userId: string
  }) => ResultAsync<SubscriptionRecord, AppError>
  readonly createCheckoutSession: (params: {
    userId: string
    plan: 'pro'
    successUrl: string
    cancelUrl: string
    requestId?: string
  }) => ResultAsync<CheckoutSessionResult, AppError>
  readonly cancelSubscription: (params: {
    userId: string
    requestId?: string
  }) => ResultAsync<void, AppError>
}

/**
 * Map a SubscriptionRecord to a client-safe PublicSubscription.
 */
const mapToPublicSubscription: (params: { record: SubscriptionRecord }) => PublicSubscription = (
  params,
) => ({
  plan: params.record.plan,
  status: params.record.status,
  currentPeriodEnd: params.record.currentPeriodEnd,
})

/**
 * Create the billing sub-router with subscription management procedures.
 *
 * Receives use-case functions via dependency injection
 * to keep the router decoupled from infrastructure.
 */
const createBillingRouter: (params: CreateBillingRouterParams) => ReturnType<typeof router> = (
  params,
) => {
  const { getSubscription, createCheckoutSession, cancelSubscription } = params

  const billingRouter = router({
    getSubscription: authedProcedure.query(async (opts) => {
      const result = await getSubscription({ userId: opts.ctx.user.id })

      return result.match(
        (record) => mapToPublicSubscription({ record }),
        (error) => throwTrpcError({ error }),
      )
    }),

    createCheckoutSession: authedProcedure
      .input(CreateCheckoutSessionInputSchema)
      .mutation(async (opts) => {
        const result = await createCheckoutSession({
          userId: opts.ctx.user.id,
          plan: opts.input.plan,
          successUrl: opts.input.successUrl,
          cancelUrl: opts.input.cancelUrl,
        })

        return result.match(
          (session) => ({ url: session.url }),
          (error) => throwTrpcError({ error }),
        )
      }),

    cancelSubscription: authedProcedure.mutation(async (opts) => {
      const result = await cancelSubscription({ userId: opts.ctx.user.id })

      return result.match(
        () => null,
        (error) => throwTrpcError({ error }),
      )
    }),
  })

  return billingRouter
}

export { createBillingRouter }
export type { CreateBillingRouterParams }
