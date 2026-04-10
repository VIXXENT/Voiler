import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

/**
 * User subscription table definition for PostgreSQL via Drizzle ORM.
 * Tracks Stripe subscription data and plan information for each user.
 *
 * @remarks
 * One subscription per user (userId is unique). Stores Stripe customer/subscription IDs
 * for payment processing and current plan status.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const UserSubscription = pgTable('user_subscription', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  plan: text('plan').notNull().default('free'),
  status: text('status').notNull().default('active'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  currentPeriodEnd: timestamp('current_period_end', {
    withTimezone: true,
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).notNull(),
})

/**
 * Zod schema for selecting a UserSubscription from the database.
 * Inferred from the Drizzle table definition — stays in sync automatically.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const UserSubscriptionSelectSchema = createSelectSchema(UserSubscription)

/**
 * Zod schema for inserting a new UserSubscription into the database.
 * Omits auto-generated fields (id, timestamps).
 */
// eslint-disable-next-line @typescript-eslint/typedef
const UserSubscriptionInsertSchema = createInsertSchema(UserSubscription, {
  plan: z.enum(['free', 'pro']).default('free'),
  status: z.enum(['active', 'canceled', 'past_due']).default('active'),
})

/**
 * TypeScript type for a UserSubscription record as selected from the database.
 */
type UserSubscriptionSelect = z.infer<typeof UserSubscriptionSelectSchema>

/**
 * TypeScript type for inserting a new UserSubscription record.
 */
type UserSubscriptionInsert = z.infer<typeof UserSubscriptionInsertSchema>

/**
 * Subscription record with narrowed plan and status literals for type safety.
 * Ensures plan is only 'free' | 'pro' and status is only 'active' | 'canceled' | 'past_due'.
 */
type SubscriptionRecord = Omit<z.infer<typeof UserSubscriptionSelectSchema>, 'plan' | 'status'> & {
  plan: 'free' | 'pro'
  status: 'active' | 'canceled' | 'past_due'
}

export { UserSubscription, UserSubscriptionSelectSchema, UserSubscriptionInsertSchema }
export type { UserSubscriptionSelect, UserSubscriptionInsert, SubscriptionRecord }
