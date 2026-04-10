import { z } from 'zod'

/**
 * Zod schema for a safe public subscription representation.
 * Excludes sensitive Stripe IDs and internal fields.
 * Used as the single source of truth for subscription data sent to clients.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const PublicSubscriptionSchema = z.object({
  plan: z.enum(['free', 'pro']),
  status: z.enum(['active', 'canceled', 'past_due']),
  currentPeriodEnd: z.date().nullable(),
})

/**
 * TypeScript type for a safe public subscription representation.
 * Inferred from {@link PublicSubscriptionSchema}.
 */
type PublicSubscription = z.infer<typeof PublicSubscriptionSchema>

export { PublicSubscriptionSchema }
export type { PublicSubscription }
