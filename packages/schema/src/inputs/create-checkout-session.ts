import { z } from 'zod'

/**
 * Zod schema for validating checkout session creation input.
 * Used as the single source of truth for the create-checkout-session
 * tRPC procedure.
 *
 * @remarks
 * Only 'pro' plan can be checked out. Free plan is the default
 * and does not require a checkout flow.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const CreateCheckoutSessionInputSchema = z.object({
  plan: z.enum(['pro']),
  successUrl: z.string().url('Invalid success URL'),
  cancelUrl: z.string().url('Invalid cancel URL'),
})

/**
 * TypeScript type for validated checkout session creation input.
 * Inferred from {@link CreateCheckoutSessionInputSchema}.
 */
type CreateCheckoutSessionInput = z.infer<typeof CreateCheckoutSessionInputSchema>

export { CreateCheckoutSessionInputSchema }
export type { CreateCheckoutSessionInput }
