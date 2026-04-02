import { ok, err, type Result } from 'neverthrow'

import type { DomainError } from '../errors/domain-error'
import { invalidPassword, weakPassword } from '../errors/domain-error'
import type { Brand } from '../types/brand'

/** A branded string representing a validated password. */
export type Password = Brand<string, 'Password'>

/**
 * Parameters for creating a Password.
 */
interface CreatePasswordParams {
  value: string
}

const MIN_LENGTH = 8
const MAX_LENGTH = 128
const HAS_LETTER = /[a-zA-Z]/
const HAS_DIGIT = /\d/

/**
 * Validate and create a Password value object.
 *
 * OWASP rules: minimum 8 characters, at least one letter
 * and one digit.
 *
 * @returns A Result containing the branded Password
 *          or a DomainError.
 */
export const createPassword: (params: CreatePasswordParams) => Result<Password, DomainError> = (
  params,
) => {
  const { value } = params

  if (value.length < MIN_LENGTH) {
    return err(invalidPassword(`Password must be at least ${String(MIN_LENGTH)} characters`))
  }

  if (value.length > MAX_LENGTH) {
    return err(invalidPassword(`Password must not exceed ${String(MAX_LENGTH)} characters`))
  }

  if (!HAS_LETTER.test(value) || !HAS_DIGIT.test(value)) {
    return err(weakPassword('Password must contain at least one letter' + ' and one digit'))
  }

  return ok(value as Password)
}
