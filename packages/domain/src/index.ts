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
  invalidEmail,
  invalidPassword,
  userAlreadyExists,
  userNotFound,
  weakPassword,
} from './errors/domain-error'
export {
  projectNotFound,
  taskNotFound,
  invalidStatusTransition,
  invalidAssignment,
  insufficientPermission,
  invalidProjectName,
  invalidTaskTitle,
  memberNotFound,
  alreadyMember,
  cannotRemoveOwner,
  notAMember,
} from './errors/project-errors'

// Validation
export { validateProjectName } from './validation/project-validation'
export type { TaskStatus } from './validation/task-validation'
export { validateTaskTitle, canTransitionStatus } from './validation/task-validation'
export { canAssignResponsible } from './validation/assignment-validation'
export type { MemberRole } from './validation/member-validation'
export { validateMemberRole } from './validation/member-validation'
export type { ProjectRole } from './validation/permission-validation'
export { resolveProjectRole, canPerformAction } from './validation/permission-validation'

// Value objects
export type { Email } from './value-objects/email'
export { createEmail } from './value-objects/email'

export type { Password } from './value-objects/password'
export { createPassword } from './value-objects/password'

export type { UserId } from './value-objects/user-id'
export { createUserId } from './value-objects/user-id'

// Entities
export type { UserEntity, UserRole } from './entities/user'
