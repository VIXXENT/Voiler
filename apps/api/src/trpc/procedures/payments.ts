import { TRPCError } from '@trpc/server'
import type { CheckoutSession, IPaymentService } from '@voiler/mod-payments'
import { z } from 'zod'

import { authedProcedure, publicProcedure, router } from '../context.js'

/** Dependencies for the payment router. */
interface CreatePaymentRouterParams {
  readonly paymentService: IPaymentService
}

/** tRPC router for payment operations. */
const createPaymentRouter = (params: CreatePaymentRouterParams) => {
  const { paymentService } = params

  return router({
    createCheckout: authedProcedure
      .input(
        z.object({
          customerId: z.string().min(1),
          priceId: z.string().min(1),
          successUrl: z.string().url(),
          cancelUrl: z.string().url(),
        }),
      )
      .mutation(async ({ input }) => {
        const result = await paymentService.createCheckoutSession(input)
        return result.match(
          (session: CheckoutSession) => session,
          () => {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to create checkout session',
            })
          },
        )
      }),

    // TODO: Real Stripe integration MUST verify the
    // webhook signature (Stripe-Signature header) before
    // processing events. Without verification, any caller
    // can forge webhook payloads.
    webhook: publicProcedure
      .input(
        z.object({
          event: z.object({
            eventId: z.string(),
            type: z.enum(['checkout.completed', 'payment.failed', 'subscription.updated']),
            customerId: z.string(),
            payload: z.record(z.unknown()),
            occurredAt: z.coerce.date(),
          }),
        }),
      )
      .mutation(async ({ input }) => {
        const result = await paymentService.handleWebhookEvent(input)
        return result.match(
          () => ({ received: true }),
          () => {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to process webhook event',
            })
          },
        )
      }),
  })
}

export { createPaymentRouter }
export type { CreatePaymentRouterParams }
