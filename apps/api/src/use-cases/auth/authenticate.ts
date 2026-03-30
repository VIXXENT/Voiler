import { errAsync, okAsync } from 'neverthrow'
import type { ResultAsync } from 'neverthrow'
import { createEmail, userNotFound } from '@gemtest/domain'
import type { UserEntity, Email } from '@gemtest/domain'
import type { UserWithPassword } from '@gemtest/core'
import type {
  AppError,
  IUserRepository,
  IPasswordService,
  ITokenService,
} from '@gemtest/core'
import { validationError } from '@gemtest/core'
import { LoginInputSchema } from '@gemtest/schema'
import type { LoginInput } from '@gemtest/schema'

// ---------------------------------------------------------------------------
// Dependency types
// ---------------------------------------------------------------------------

/**
 * Dependencies required by the Authenticate use case.
 *
 * Why: All three ports are injected so the use case never touches concrete
 * infrastructure (DB driver, bcrypt, JWT library). Each can be replaced with
 * a test double independently.
 */
type AuthenticateDeps = {
  readonly userRepository: IUserRepository
  readonly passwordService: IPasswordService
  readonly tokenService: ITokenService
}

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

/**
 * Result produced by a successful authentication.
 *
 * Why: Defined here rather than using AuthResponse from @gemtest/schema so
 * the use case stays decoupled from the presentation layer. Resolvers/adapters
 * map this to the GraphQL/HTTP response shape they need.
 */
export type AuthResult = {
  readonly token: string
  readonly user: UserEntity
}

/** Default token lifetime: 1 hour in seconds. */
const TOKEN_TTL_SECONDS: number = 3600

// ---------------------------------------------------------------------------
// Internal helpers (flatten .andThen() nesting)
// ---------------------------------------------------------------------------

/** Rejects null records with a UserNotFound error. */
const ensureUserExists: (
  params: { readonly record: UserWithPassword | null; readonly email: string },
) => ResultAsync<UserWithPassword, AppError> = (params) => {
  const { record, email } = params
  if (record === null) {
    return errAsync(userNotFound(email))
  }
  return okAsync(record)
}

// ---------------------------------------------------------------------------
// Use case factory
// ---------------------------------------------------------------------------

/**
 * Factory for the Authenticate use case.
 *
 * Orchestrates: email validation → user lookup (with hash) → password
 * verification → token generation → AuthResult assembly.
 *
 * Uses `findByEmailWithPassword` to access the stored hash without leaking
 * it into the public `UserEntity` shape used elsewhere in the application.
 *
 * Why a factory: Deps injected once, execute fn stays pure and testable.
 *
 * @param deps - Port interfaces for repository, password, and token services.
 * @returns An execute function that resolves to an AuthResult or AppError.
 */
export const authenticateUseCase: (
  deps: AuthenticateDeps,
) => (params: LoginInput) => ResultAsync<AuthResult, AppError> = (deps) => {
  const { userRepository, passwordService, tokenService } = deps

  return (params) => {
    const { email, password } = params

    // 0. Validate raw input shape with Zod
    const parseResult: ReturnType<typeof LoginInputSchema.safeParse> =
      LoginInputSchema.safeParse({ email, password })

    if (!parseResult.success) {
      const message: string =
        parseResult.error.issues[0]?.message ?? 'Invalid input'
      return errAsync(validationError({ message }))
    }

    // 1. Construct domain Email value object (validates format)
    const emailResult: ReturnType<typeof createEmail> =
      createEmail({ value: email })
    if (emailResult.isErr()) {
      return errAsync(emailResult.error)
    }

    // TypeScript narrows emailResult to Ok<Email, DomainError> after the guard
    const validEmail: Email = emailResult.value

    // 2. Look up user with password hash
    return userRepository
      .findByEmailWithPassword(validEmail)
      .andThen((record) => ensureUserExists({ record, email }))
      // 3. Verify password
      .andThen((record) =>
        passwordService
          .verify({ plaintext: password, hash: record.passwordHash })
          .map((isValid) => ({ record, isValid })),
      )
      // 4. Reject bad password
      .andThen(({ record, isValid }) => {
        if (!isValid) {
          return errAsync(
            validationError({ message: 'Invalid email or password' }),
          )
        }
        return okAsync(record)
      })
      // 5. Generate JWT token
      .andThen((record) =>
        tokenService
          .generate({ sub: record.id, expiresInSeconds: TOKEN_TTL_SECONDS })
          .map((token): AuthResult => ({ token, user: record })),
      )
  }
}
