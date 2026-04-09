import type { DomainError } from './domain-error'

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

/** Create an InvalidStatusTransition domain error. */
export const invalidStatusTransition: (message: string) => DomainError = (message) => ({
  tag: 'InvalidStatusTransition',
  message,
})

/** Create an InvalidAssignment domain error. */
export const invalidAssignment: (message: string) => DomainError = (message) => ({
  tag: 'InvalidAssignment',
  message,
})

/** Create an InsufficientPermission domain error. */
export const insufficientPermission: (message: string) => DomainError = (message) => ({
  tag: 'InsufficientPermission',
  message,
})

/** Create an InvalidProjectName domain error. */
export const invalidProjectName: (message: string) => DomainError = (message) => ({
  tag: 'InvalidProjectName',
  message,
})

/** Create an InvalidTaskTitle domain error. */
export const invalidTaskTitle: (message: string) => DomainError = (message) => ({
  tag: 'InvalidTaskTitle',
  message,
})

/** Create a MemberNotFound domain error. */
export const memberNotFound: (message: string) => DomainError = (message) => ({
  tag: 'MemberNotFound',
  message,
})

/** Create an AlreadyMember domain error. */
export const alreadyMember: (message: string) => DomainError = (message) => ({
  tag: 'AlreadyMember',
  message,
})

/** Create a CannotRemoveOwner domain error. */
export const cannotRemoveOwner: (message: string) => DomainError = (message) => ({
  tag: 'CannotRemoveOwner',
  message,
})

/** Create a NotAMember domain error. */
export const notAMember: (message: string) => DomainError = (message) => ({
  tag: 'NotAMember',
  message,
})
