import type { AppError, IProjectMemberRepository, IProjectRepository } from '@voiler/core'
import { ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the deleteUserData use case.
 */
interface DeleteUserDataDeps {
  readonly projectRepository: IProjectRepository
  readonly memberRepository: IProjectMemberRepository
}

/**
 * Parameters for deleting all data belonging to a user.
 */
interface DeleteUserDataParams {
  readonly userId: string
}

/**
 * Factory that builds a use case for deleting all data belonging to a user.
 *
 * Removes all memberships, then deletes all projects owned by the user
 * (with cascade deletion of their tasks and members).
 */
export const createDeleteUserData: (
  deps: DeleteUserDataDeps,
) => (params: DeleteUserDataParams) => ResultAsync<void, AppError> = (deps) => (params) => {
  const { projectRepository, memberRepository } = deps
  const { userId } = params

  return memberRepository.deleteByUser({ userId }).andThen(() =>
    projectRepository.findByOwner({ ownerId: userId }).andThen((projects) => {
      const deletions = projects.map((p) => projectRepository.deleteWithCascade({ id: p.id }))
      return ResultAsync.combine(deletions).map(() => undefined)
    }),
  )
}
