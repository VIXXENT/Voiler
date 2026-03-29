import { z } from 'zod'
import { ok, err } from 'neverthrow'
import type { Result } from 'neverthrow'
import { invalidEmail } from '../errors/domain-error.js'
import type { DomainError } from '../errors/domain-error.js'

/**
 * Branded type for a validated email address.
 *
 * Why: A branded type ensures that only values produced by `createEmail`
 * (which enforces RFC-5321 format) can be used as Email — plain strings are
 * rejected at compile time.
 */
type Brand<T, B> = T & { readonly __brand: B }
export type Email = Brand<string, 'Email'>

/** Internal Zod schema used to validate raw email strings. */
const EmailSchema = z.string().email('Invalid email address')

/** Parameters for createEmail. */
type CreateEmailParams = {
  readonly value: string
}

/**
 * Validates a raw string and returns a branded Email value object.
 *
 * Why: Centralising email validation here means every Email in the domain
 * has been validated exactly once and carries type-level proof.
 *
 * @param params - Object containing the raw email string.
 * @returns Ok<Email> if the value passes RFC-5321 validation,
 *          Err<InvalidEmail> otherwise.
 */
export const createEmail = (params: CreateEmailParams): Result<Email, DomainError> => {
  const { value } = params
  const result = EmailSchema.safeParse(value)

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Invalid email'
    return err(invalidEmail(message))
  }

  return ok(result.data as Email)
}
