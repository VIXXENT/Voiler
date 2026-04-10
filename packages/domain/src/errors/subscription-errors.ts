import type { DomainError } from './domain-error'

/** Create a ProjectLimitReached domain error. */
export const projectLimitReached: (message: string) => DomainError = (message) => ({
  tag: 'ProjectLimitReached',
  message,
})

/** Create a MemberLimitReached domain error. */
export const memberLimitReached: (message: string) => DomainError = (message) => ({
  tag: 'MemberLimitReached',
  message,
})

/** Create a TaskLimitReached domain error. */
export const taskLimitReached: (message: string) => DomainError = (message) => ({
  tag: 'TaskLimitReached',
  message,
})

/** Create a ProjectFrozen domain error. */
export const projectFrozen: (message: string) => DomainError = (message) => ({
  tag: 'ProjectFrozen',
  message,
})

/** Create a SubscriptionNotFound domain error. */
export const subscriptionNotFound: (message: string) => DomainError = (message) => ({
  tag: 'SubscriptionNotFound',
  message,
})
