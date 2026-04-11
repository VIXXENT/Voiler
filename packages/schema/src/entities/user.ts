import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

/**
 * User table definition for PostgreSQL via Drizzle ORM.
 * Schema owned by Better Auth with custom `role` field.
 *
 * @remarks
 * Better Auth expects: id (text), name, email, emailVerified,
 * image, createdAt, updatedAt. Passwords are stored in the
 * `account` table, not here.
 * The `role` field is a custom extension for RBAC.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const User = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('user'),
  // Required by Better Auth admin plugin
  banned: boolean('banned').notNull().default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires', { withTimezone: true }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).notNull(),
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
