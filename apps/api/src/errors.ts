/**
 * Domain error types for the API.
 * Following the tagged union pattern for exhaustiveness.
 */

export type DatabaseError = {
  readonly _tag: 'DatabaseError'
  readonly message: string
  readonly cause?: unknown
}

export type ValidationError = {
  readonly _tag: 'ValidationError'
  readonly field: string
  readonly message: string
}

export type AuthError = {
  readonly _tag: 'AuthError'
  readonly message: string
}

export type AppError = DatabaseError | ValidationError | AuthError

export type DbErrorParams = {
  readonly message: string
  readonly cause?: unknown
}

type DbErrorFn = (params: DbErrorParams) => DatabaseError

/**
 * Creates a DatabaseError object.
 *
 * Used across the API to wrap database-related failures into a type-safe format
 * that includes the original cause for easier debugging.
 *
 * @param params - Object containing the error message and the optional cause.
 * @returns A DatabaseError object with the 'DatabaseError' tag.
 */
export const dbError: DbErrorFn = (params: DbErrorParams): DatabaseError => {
  const { message, cause }: DbErrorParams = params
  return {
    _tag: 'DatabaseError',
    message,
    cause,
  }
}

export type ValidationErrorParams = {
  readonly field: string
  readonly message: string
}

type ValidationErrorFn = (params: ValidationErrorParams) => ValidationError

/**
 * Creates a ValidationError object.
 *
 * Used to report input validation failures in a consistent format that identifies
 * both the problematic field and the reason for the failure.
 *
 * @param params - Object containing the field name and the error message.
 * @returns A ValidationError object with the 'ValidationError' tag.
 */
export const validationError: ValidationErrorFn = (
  params: ValidationErrorParams,
): ValidationError => {
  const { field, message }: ValidationErrorParams = params
  return {
    _tag: 'ValidationError',
    field,
    message,
  }
}
