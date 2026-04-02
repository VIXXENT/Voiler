import type { AppError, IPasswordService, ITokenService, IUserRepository } from '@voiler/core'
import {
  createEmail,
  invalidPassword,
  type DomainError,
  type Email,
  type UserEntity,
} from '@voiler/domain'
import { errAsync, type Result, type ResultAsync } from 'neverthrow'

/**
 * Successful authentication result.
 */
export interface AuthResult {
  readonly token: string
  readonly user: UserEntity
}

/**
 * Dependencies injected into the authenticate use case.
 *
 * `findPasswordHash` is a dedicated query for retrieving
 * the password hash by email, avoiding the need to expose
 * the hash through the UserEntity domain model.
 */
interface AuthenticateDeps {
  readonly userRepository: IUserRepository
  readonly passwordService: IPasswordService
  readonly tokenService: ITokenService
  readonly findPasswordHash: (params: { email: string }) => ResultAsync<string | null, AppError>
}

/**
 * Parameters for authenticating a user.
 */
interface AuthenticateParams {
  readonly email: string
  readonly password: string
}

/** Token expiration: 24 hours in seconds. */
const TOKEN_EXPIRY_SECONDS: number = 86_400

/**
 * Factory that builds a use case for authenticating a
 * user with email and password.
 *
 * Validates the email, looks up the user, verifies the
 * password hash, and generates a signed JWT on success.
 */
export const createAuthenticate: (
  deps: AuthenticateDeps,
) => (params: AuthenticateParams) => ResultAsync<AuthResult, AppError> = (deps) => (params) => {
  const { userRepository, passwordService, tokenService, findPasswordHash } = deps
  const { email, password } = params

  const emailResult: Result<Email, DomainError> = createEmail({ value: email })

  if (emailResult.isErr()) {
    return errAsync<AuthResult, AppError>(emailResult.error)
  }

  const brandedEmail: Email = emailResult.value

  return userRepository
    .findByEmail({ email: brandedEmail })
    .andThen((user): ResultAsync<AuthResult, AppError> => {
      if (user === null) {
        // Run dummy hash to equalize timing with
        // the real verify path (~300ms argon2).
        return passwordService
          .hash({ plaintext: password })
          .andThen(
            (): ResultAsync<AuthResult, AppError> =>
              errAsync<AuthResult, AppError>(invalidPassword('Invalid credentials')),
          )
      }

      return findPasswordHash({ email })
        .andThen((hash): ResultAsync<boolean, AppError> => {
          if (hash === null) {
            return passwordService
              .hash({ plaintext: password })
              .andThen(
                (): ResultAsync<boolean, AppError> =>
                  errAsync<boolean, AppError>(invalidPassword('Invalid credentials')),
              )
          }

          return passwordService.verify({
            plaintext: password,
            hash,
          })
        })
        .andThen((isValid): ResultAsync<string, AppError> => {
          if (!isValid) {
            return errAsync<string, AppError>(invalidPassword('Invalid credentials'))
          }

          return tokenService.generate({
            sub: user.id,
            expiresInSeconds: TOKEN_EXPIRY_SECONDS,
          })
        })
        .map(
          (token): AuthResult => ({
            token,
            user,
          }),
        )
    })
}
