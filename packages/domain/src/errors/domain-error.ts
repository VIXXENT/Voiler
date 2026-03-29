/**
 * Domain error tagged union for exhaustive pattern matching.
 *
 * Why: Using a discriminated union with a `tag` field enables exhaustive
 * handling via `switch (error.tag)` or `.match()` without any `instanceof`
 * checks. All domain errors are value types — never thrown.
 */

/** Represents an invalid email format or value. */
export type InvalidEmail = {
  readonly tag: 'InvalidEmail'
  readonly message: string
}

/** Represents an invalid password (too short, malformed, etc.). */
export type InvalidPassword = {
  readonly tag: 'InvalidPassword'
  readonly message: string
}

/** Represents a password that does not meet complexity requirements. */
export type WeakPassword = {
  readonly tag: 'WeakPassword'
  readonly message: string
}

/** Represents a lookup failure when a user cannot be found by the given id. */
export type UserNotFound = {
  readonly tag: 'UserNotFound'
  readonly userId: string
}

/** Represents a conflict when attempting to create a user with an existing email. */
export type UserAlreadyExists = {
  readonly tag: 'UserAlreadyExists'
  readonly email: string
}

/**
 * Union of all domain errors.
 * Use `switch (error.tag)` for exhaustive matching.
 */
export type DomainError =
  | InvalidEmail
  | InvalidPassword
  | WeakPassword
  | UserNotFound
  | UserAlreadyExists

// ---------------------------------------------------------------------------
// Constructor helpers — produce typed error values without `new` or `throw`
// ---------------------------------------------------------------------------

/**
 * Creates an InvalidEmail domain error.
 * @param message - Human-readable description of the validation failure.
 * @returns An InvalidEmail error value.
 */
export const invalidEmail = (message: string): InvalidEmail => ({
  tag: 'InvalidEmail',
  message,
})

/**
 * Creates an InvalidPassword domain error.
 * @param message - Human-readable description of the validation failure.
 * @returns An InvalidPassword error value.
 */
export const invalidPassword = (message: string): InvalidPassword => ({
  tag: 'InvalidPassword',
  message,
})

/**
 * Creates a WeakPassword domain error.
 * @param message - Human-readable description of the weakness.
 * @returns A WeakPassword error value.
 */
export const weakPassword = (message: string): WeakPassword => ({
  tag: 'WeakPassword',
  message,
})

/**
 * Creates a UserNotFound domain error.
 * @param userId - The identifier that was not found.
 * @returns A UserNotFound error value.
 */
export const userNotFound = (userId: string): UserNotFound => ({
  tag: 'UserNotFound',
  userId,
})

/**
 * Creates a UserAlreadyExists domain error.
 * @param email - The email address that already exists.
 * @returns A UserAlreadyExists error value.
 */
export const userAlreadyExists = (email: string): UserAlreadyExists => ({
  tag: 'UserAlreadyExists',
  email,
})
