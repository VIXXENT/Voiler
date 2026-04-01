import type { AppError, IUserRepository } from "@voiler/core"
import type { UserEntity } from "@voiler/domain"
import type { ResultAsync } from "neverthrow"

/**
 * Dependencies injected into the listUsers use case.
 */
interface ListUsersDeps {
  readonly userRepository: IUserRepository
}

/**
 * Factory that builds a use case for retrieving all users.
 */
export const createListUsers: (
  deps: ListUsersDeps,
) => () => ResultAsync<UserEntity[], AppError> = (
  deps,
) => () => {
  const { userRepository } = deps

  return userRepository.findAll()
}
