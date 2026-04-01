/**
 * @module @gemtest/schema
 *
 * Zod + Drizzle schemas — single source of truth for all entities.
 * Drizzle owns table definitions, Zod owns validation rules.
 * Types are inferred from schemas — never manually defined.
 *
 * @example
 * ```ts
 * import { User, UserSelectSchema } from '@gemtest/schema'
 * // User = Drizzle pgTable (for queries)
 * // UserSelectSchema = Zod schema (for validation)
 * ```
 */
export {
  User,
  UserSelectSchema,
  UserInsertSchema,
} from './entities/user.js'

export type {
  UserSelect,
  UserInsert,
} from './entities/user.js'
