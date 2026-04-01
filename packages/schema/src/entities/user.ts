import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

/**
 * User table definition for PostgreSQL via Drizzle ORM.
 * Single source of truth for the User entity schema.
 *
 * @remarks
 * Uses UUID primary keys for security (non-enumerable).
 * Timestamps use `defaultNow()` for automatic creation tracking.
 * The `role` column defaults to 'user' — extended roles added in Plan C.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const User = pgTable('user', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Zod schema for selecting a User from the database.
 * Inferred from the Drizzle table definition — stays in sync automatically.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const UserSelectSchema = createSelectSchema(User)

/**
 * Zod schema for inserting a new User into the database.
 * Omits auto-generated fields (id, timestamps).
 */
// eslint-disable-next-line @typescript-eslint/typedef
const UserInsertSchema = createInsertSchema(User, {
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email format'),
  role: z.enum(['user', 'admin', 'dev']).default('user'),
})

/**
 * TypeScript type for a User record as selected from the database.
 */
type UserSelect = z.infer<typeof UserSelectSchema>

/**
 * TypeScript type for inserting a new User record.
 */
type UserInsert = z.infer<typeof UserInsertSchema>

export { User, UserSelectSchema, UserInsertSchema }
export type { UserSelect, UserInsert }
