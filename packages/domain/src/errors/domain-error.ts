/**
 * Discriminated union of all domain-level errors.
 *
 * Each variant carries a `tag` for exhaustive pattern matching
 * and a human-readable `message`.
 */
export type DomainError =
  | { readonly tag: 'InvalidEmail'; readonly message: string }
  | { readonly tag: 'InvalidPassword'; readonly message: string }
  | { readonly tag: 'InvalidUserId'; readonly message: string }
  | { readonly tag: 'WeakPassword'; readonly message: string }
  | { readonly tag: 'UserNotFound'; readonly message: string }
  | { readonly tag: 'UserAlreadyExists'; readonly message: string }
  | { readonly tag: 'ProjectNotFound'; readonly message: string }
  | { readonly tag: 'TaskNotFound'; readonly message: string }
  | { readonly tag: 'InvalidStatusTransition'; readonly message: string }
  | { readonly tag: 'InvalidAssignment'; readonly message: string }
  | { readonly tag: 'InsufficientPermission'; readonly message: string }
  | { readonly tag: 'InvalidProjectName'; readonly message: string }
  | { readonly tag: 'InvalidTaskTitle'; readonly message: string }
  | { readonly tag: 'MemberNotFound'; readonly message: string }
  | { readonly tag: 'AlreadyMember'; readonly message: string }
  | { readonly tag: 'CannotRemoveOwner'; readonly message: string }
  | { readonly tag: 'NotAMember'; readonly message: string }
  | { readonly tag: 'ProjectLimitReached'; readonly message: string }
  | { readonly tag: 'MemberLimitReached'; readonly message: string }
  | { readonly tag: 'TaskLimitReached'; readonly message: string }
  | { readonly tag: 'ProjectFrozen'; readonly message: string }
  | { readonly tag: 'SubscriptionNotFound'; readonly message: string }

/** Create an InvalidEmail domain error. */
export const invalidEmail: (message: string) => DomainError = (message) => ({
  tag: 'InvalidEmail',
  message,
})

/** Create an InvalidPassword domain error. */
export const invalidPassword: (message: string) => DomainError = (message) => ({
  tag: 'InvalidPassword',
  message,
})

/** Create a WeakPassword domain error. */
export const weakPassword: (message: string) => DomainError = (message) => ({
  tag: 'WeakPassword',
  message,
})

/** Create an InvalidUserId domain error. */
export const invalidUserId: (message: string) => DomainError = (message) => ({
  tag: 'InvalidUserId',
  message,
})

/** Create a UserNotFound domain error. */
export const userNotFound: (message: string) => DomainError = (message) => ({
  tag: 'UserNotFound',
  message,
})

/** Create a UserAlreadyExists domain error. */
export const userAlreadyExists: (message: string) => DomainError = (message) => ({
  tag: 'UserAlreadyExists',
  message,
})
