import type { AppError, IProjectRepository } from '@voiler/core'
import { insufficientPermission, projectNotFound } from '@voiler/domain'
import { errAsync } from 'neverthrow'
import type { ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the deleteProject use case.
 */
interface DeleteProjectDeps {
  readonly projectRepository: IProjectRepository
}

/**
 * Parameters for deleting a project.
 */
interface DeleteProjectParams {
  readonly projectId: string
  readonly userId: string
}

/**
 * Factory that builds a use case for deleting a project.
 *
 * @remarks
 * The deletion is atomic — all tasks and assignees are removed
 * in a single transaction via `deleteWithCascade`.
 * Only the project owner can delete their project.
 */
export const createDeleteProject: (
  deps: DeleteProjectDeps,
) => (params: DeleteProjectParams) => ResultAsync<void, AppError> = (deps) => (params) => {
  return deps.projectRepository.findById({ id: params.projectId }).andThen((project) => {
    if (!project) {
      return errAsync(projectNotFound(`Project '${params.projectId}' not found`))
    }

    if (project.ownerId !== params.userId) {
      return errAsync(insufficientPermission('Only the project owner can delete it'))
    }

    return deps.projectRepository.deleteWithCascade({ projectId: params.projectId })
  })
}
