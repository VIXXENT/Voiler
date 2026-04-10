import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ProjectRecord,
} from '@voiler/core'
import { okAsync, ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the listUserProjects use case.
 */
interface ListUserProjectsDeps {
  readonly projectRepository: IProjectRepository
  readonly memberRepository: IProjectMemberRepository
}

/**
 * Parameters for listing all projects a user can access.
 */
interface ListUserProjectsParams {
  readonly userId: string
}

/**
 * Factory that builds a use case for listing all projects a user can access.
 *
 * Returns owned projects plus any projects the user is a member of,
 * deduplicated in case the user is both owner and member.
 */
export const createListUserProjects: (
  deps: ListUserProjectsDeps,
) => (params: ListUserProjectsParams) => ResultAsync<ProjectRecord[], AppError> =
  (deps) => (params) => {
    const { projectRepository, memberRepository } = deps
    const { userId } = params

    return ResultAsync.combine([
      projectRepository.findByOwner({ ownerId: userId }),
      memberRepository
        .findProjectIdsByUser({ userId })
        .andThen((ids) =>
          ids.length === 0
            ? okAsync([])
            : ResultAsync.combine(ids.map((id) => projectRepository.findById({ id }))).map(
                (results) => results.filter((p): p is ProjectRecord => p !== null),
              ),
        ),
    ]).map(([owned, member]) => {
      const ownedIds = new Set(owned.map((p) => p.id))
      const deduplicated = member.filter((p) => !ownedIds.has(p.id))
      return [...owned, ...deduplicated]
    })
  }
