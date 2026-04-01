import type { AppError, IUserRepository } from "@voiler/core"
import type { UserEntity } from "@voiler/domain"
import type { ResultAsync } from "neverthrow"

/**
 * Dependencies injected into the getUser use case.
 */
interface GetUserDeps {
  readonly userRepository: IUserRepository
}

/**
 * Parameters for retrieving a user by ID.
 */
interface GetUserParams {
  readonly id: string
}

/**
 * Factory that builds a use case for retrieving a user
 * by their unique identifier.
 */
export const createGetUser: (
  deps: GetUserDeps,
) => (
  params: GetUserParams,
) => ResultAsync<UserEntity | null, AppError> = (
  deps,
) => (params) => {
  const { userRepository } = deps
  const { id } = params

  return userRepository.findById({ id })
}
