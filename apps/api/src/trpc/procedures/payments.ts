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
          (error: { readonly message: string }) => {
            throw new Error(error.message)
          },
        )
      }),

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
          (error: { readonly message: string }) => {
            throw new Error(error.message)
          },
        )
      }),
  })
}

export { createPaymentRouter }
export type { CreatePaymentRouterParams }
