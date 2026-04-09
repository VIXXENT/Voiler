/**
 * @module @voiler/domain
 *
 * Domain layer — entities, value objects, and domain errors.
 * This package has ZERO infrastructure dependencies.
 */

// Brand utility
export type { Brand } from './types/brand'

// Domain errors
export type { DomainError } from './errors/domain-error'
export {
  insufficientPermission,
  invalidEmail,
  invalidPassword,
  invalidTaskTitle,
  projectNotFound,
  taskNotFound,
  userAlreadyExists,
  userNotFound,
  weakPassword,
} from './errors/domain-error'

// Value objects
export type { Email } from './value-objects/email'
export { createEmail } from './value-objects/email'

export type { Password } from './value-objects/password'
export { createPassword } from './value-objects/password'

export type { UserId } from './value-objects/user-id'
export { createUserId } from './value-objects/user-id'

// Entities
export type { UserEntity, UserRole } from './entities/user'
