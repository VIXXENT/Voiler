import { z } from 'zod'
import { ok, err } from 'neverthrow'
import type { Result } from 'neverthrow'
import { invalidPassword, weakPassword } from '../errors/domain-error.js'
import type { DomainError } from '../errors/domain-error.js'

/**
 * Branded type for a validated (and potentially hashed) password value.
 *
 * Why: Branding prevents a plain string from being passed as a Password.
 * The brand signals that the value has passed domain validation rules.
 * Actual hashing happens in the infrastructure layer; the domain only
 * enforces structural requirements.
 */
type Brand<T, B> = T & { readonly __brand: B }
export type Password = Brand<string, 'Password'>

/** Minimum password length enforced by domain rules. */
const MIN_LENGTH = 8

/** Regex requiring at least one letter and one digit. */
const COMPLEXITY_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/

/** Internal Zod schema for structural validation. */
const PasswordSchema = z
  .string()
  .min(MIN_LENGTH, `Password must be at least ${MIN_LENGTH} characters`)

/** Parameters for createPassword. */
type CreatePasswordParams = {
  readonly value: string
}

/**
 * Validates a raw string against domain password rules and returns a branded Password.
 *
 * Rules:
 *   1. Minimum 8 characters (structural — InvalidPassword on failure).
 *   2. Must contain at least one letter and one digit (complexity — WeakPassword on failure).
 *
 * Why: Keeping password rules in the domain ensures they apply regardless of
 * which transport or framework calls this code.
 *
 * @param params - Object containing the raw password string.
 * @returns Ok<Password> if all rules pass,
 *          Err<InvalidPassword> for length violations,
 *          Err<WeakPassword> for complexity violations.
 */
export const createPassword = (params: CreatePasswordParams): Result<Password, DomainError> => {
  const { value } = params

  const structuralResult = PasswordSchema.safeParse(value)
  if (!structuralResult.success) {
    const message = structuralResult.error.issues[0]?.message ?? 'Invalid password'
    return err(invalidPassword(message))
  }

  if (!COMPLEXITY_REGEX.test(value)) {
    return err(weakPassword('Password must contain at least one letter and one digit'))
  }

  return ok(value as Password)
}
