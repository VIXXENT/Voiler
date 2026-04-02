import { ok, err, type Result } from 'neverthrow'

import type { DomainError } from '../errors/domain-error'
import { invalidUserId } from '../errors/domain-error'
import type { Brand } from '../types/brand'

/** A branded string representing a unique user identifier. */
export type UserId = Brand<string, 'UserId'>

/**
 * Parameters for creating a UserId.
 */
interface CreateUserIdParams {
  value: string
}

/**
 * Validate and create a UserId value object.
 *
 * @returns A Result containing the branded UserId or a DomainError.
 */
export const createUserId: (params: CreateUserIdParams) => Result<UserId, DomainError> = (
  params,
) => {
  const { value } = params

  if (value.trim().length === 0) {
    return err(invalidUserId('UserId must be a non-empty string'))
  }

  return ok(value as UserId)
}
