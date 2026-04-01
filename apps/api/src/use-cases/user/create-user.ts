import type {
  AppError,
  IPasswordService,
  IUserRepository,
} from "@voiler/core"
import type { UserEntity } from "@voiler/domain"
import type { ResultAsync } from "neverthrow"

/**
 * Dependencies injected into the createUser use case.
 */
interface CreateUserDeps {
  readonly userRepository: IUserRepository
  readonly passwordService: IPasswordService
}

/**
 * Parameters for creating a new user.
 */
interface CreateUserParams {
  readonly name: string
  readonly email: string
  readonly password: string
}

/**
 * Factory that builds a use case for creating a new user.
 *
 * Hashes the password and delegates persistence to the
 * repository. Duplicate-email detection is handled by
 * the database unique constraint (repository returns
 * InfrastructureError).
 */
export const createCreateUser: (
  deps: CreateUserDeps,
) => (
  params: CreateUserParams,
) => ResultAsync<UserEntity, AppError> = (deps) => (
  params,
) => {
  const { userRepository, passwordService } = deps
  const { name, email, password } = params

  return passwordService
    .hash({ plaintext: password })
    .andThen((passwordHash) =>
      userRepository.create({
        data: {
          name,
          email,
          passwordHash,
          role: "user",
        },
      }),
    )
}
