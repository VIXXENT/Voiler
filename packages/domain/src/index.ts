/**
 * @gemtest/domain — pure business logic package.
 *
 * Re-exports all public domain types, value objects, and error constructors.
 * No infrastructure dependencies (no DB, no HTTP, no framework).
 */

// Entities
export type { UserEntity } from './entities/user.js'

// Value objects — types
export type { UserId } from './value-objects/user-id.js'
export type { Email } from './value-objects/email.js'
export type { Password } from './value-objects/password.js'

// Value objects — constructors
export { createUserId } from './value-objects/user-id.js'
export { createEmail } from './value-objects/email.js'
export { createPassword } from './value-objects/password.js'

// Domain errors — types
export type {
  DomainError,
  InvalidEmail,
  InvalidPassword,
  WeakPassword,
  UserNotFound,
  UserAlreadyExists,
} from './errors/domain-error.js'

// Domain errors — constructors
export {
  invalidEmail,
  invalidPassword,
  weakPassword,
  userNotFound,
  userAlreadyExists,
} from './errors/domain-error.js'
