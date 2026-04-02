import { ok, err, type Result } from 'neverthrow'

import type { DomainError } from '../errors/domain-error'
import { invalidEmail } from '../errors/domain-error'
import type { Brand } from '../types/brand'

/** A branded string representing a validated email address. */
export type Email = Brand<string, 'Email'>

/**
 * Parameters for creating an Email.
 */
interface CreateEmailParams {
  value: string
}

/**
 * Basic email regex: must contain `@` with non-empty local
 * and domain parts, and the domain must have a dot.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validate and create an Email value object.
 *
 * @returns A Result containing the branded Email or a DomainError.
 */
export const createEmail: (params: CreateEmailParams) => Result<Email, DomainError> = (params) => {
  const { value } = params
  const trimmed: string = value.trim().toLowerCase()

  if (!EMAIL_REGEX.test(trimmed)) {
    return err(invalidEmail(`"${value}" is not a valid email address`))
  }

  return ok(trimmed as Email)
}
