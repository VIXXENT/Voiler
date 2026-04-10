import type { AppError, IProjectRepository } from '@voiler/core'
import { okAsync, ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the freezeUserProjects use case.
 */
interface FreezeUserProjectsDeps {
  readonly projectRepository: IProjectRepository
}

/**
 * Parameters for freezing all projects owned by a user.
 */
interface FreezeUserProjectsParams {
  readonly userId: string
}

/**
 * Factory that builds a use case for freezing all projects owned by a user.
 *
 * Fetches all projects for the owner and marks each one as frozen.
 * Returns void on success. If the user has no projects, succeeds immediately.
 */
export const createFreezeUserProjects: (
  deps: FreezeUserProjectsDeps,
) => (params: FreezeUserProjectsParams) => ResultAsync<void, AppError> =
  (deps) => (params) => {
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
            projectRepository.update({ id: p.id, data: { frozen: true, updatedAt: new Date() } }),
          ),
        )
      })
      .map(() => undefined)
  }
