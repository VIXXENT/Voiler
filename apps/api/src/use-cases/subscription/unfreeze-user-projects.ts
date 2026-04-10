import type { AppError, IProjectRepository } from '@voiler/core'
import { okAsync, ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the unfreezeUserProjects use case.
 */
interface UnfreezeUserProjectsDeps {
  readonly projectRepository: IProjectRepository
}

/**
 * Parameters for unfreezing all projects owned by a user.
 */
interface UnfreezeUserProjectsParams {
  readonly userId: string
}

/**
 * Factory that builds a use case for unfreezing all projects owned by a user.
 *
 * Fetches all projects for the owner and marks each one as not frozen.
 * Returns void on success. If the user has no projects, succeeds immediately.
 */
export const createUnfreezeUserProjects: (
  deps: UnfreezeUserProjectsDeps,
) => (params: UnfreezeUserProjectsParams) => ResultAsync<void, AppError> = (deps) => (params) => {
  const { projectRepository } = deps
  const { userId } = params

  return projectRepository
    .findByOwner({ ownerId: userId })
    .andThen((projects) => {
      if (projects.length === 0) {
        return okAsync([])
      }
      return ResultAsync.combine(
        projects.map((p) =>
          projectRepository.update({ id: p.id, data: { frozen: false, updatedAt: new Date() } }),
        ),
      )
    })
    .map(() => undefined)
}
