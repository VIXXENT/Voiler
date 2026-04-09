import type { AppError, IProjectRepository, ProjectRecord } from '@voiler/core'
import type { ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the listUserProjects use case.
 */
interface ListUserProjectsDeps {
  readonly projectRepository: IProjectRepository
}

/**
 * Parameters for listing all projects owned by a user.
 */
interface ListUserProjectsParams {
  readonly userId: string
}

/**
 * Factory that builds a use case for listing all projects owned by a user.
 *
 * Delegates to findByOwner on the repository.
 */
export const createListUserProjects: (
  deps: ListUserProjectsDeps,
) => (params: ListUserProjectsParams) => ResultAsync<ProjectRecord[], AppError> =
  (deps) => (params) => {
    const { projectRepository } = deps
    const { userId } = params

    return projectRepository.findByOwner({ ownerId: userId })
  }
