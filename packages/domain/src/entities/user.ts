import type { UserId } from '../value-objects/user-id.js'
import type { Email } from '../value-objects/email.js'

/**
 * Domain representation of a User.
 *
 * Why: This type lives in the domain layer and describes the business model.
 * It is intentionally separate from the Zod schema in @gemtest/schema (which
 * is used for serialization/DB mapping) and from any ORM entity.
 *
 * All fields are readonly to enforce immutability — updates produce new values
 * rather than mutating existing ones.
 */
export type UserEntity = {
  /** Unique identifier, branded to prevent mixing with arbitrary strings. */
  readonly id: UserId
  /** Validated email address, branded to prove it passed domain validation. */
  readonly email: Email
  /** Display name of the user. */
  readonly name: string
  /** Role string (e.g., 'user', 'admin'). Kept as string for extensibility. */
  readonly role: string
  /** Timestamp when the user was first created. */
  readonly createdAt: Date
}
