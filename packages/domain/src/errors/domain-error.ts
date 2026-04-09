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
  | { readonly tag: 'InsufficientPermission'; readonly message: string }
  | { readonly tag: 'InvalidTaskTitle'; readonly message: string }

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

/** Create a ProjectNotFound domain error. */
export const projectNotFound: (message: string) => DomainError = (message) => ({
  tag: 'ProjectNotFound',
  message,
})

/** Create a TaskNotFound domain error. */
export const taskNotFound: (message: string) => DomainError = (message) => ({
  tag: 'TaskNotFound',
  message,
})

/** Create an InsufficientPermission domain error. */
export const insufficientPermission: (message: string) => DomainError = (message) => ({
  tag: 'InsufficientPermission',
  message,
})

/** Create an InvalidTaskTitle domain error. */
export const invalidTaskTitle: (message: string) => DomainError = (message) => ({
  tag: 'InvalidTaskTitle',
  message,
})
