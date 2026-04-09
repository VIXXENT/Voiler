import type { AppError, IProjectRepository } from '@voiler/core'
import { insufficientPermission, projectNotFound } from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

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
  readonly userId: string
  readonly projectId: string
}

/**
 * Factory that builds a use case for deleting a project with cascade.
 *
 * Returns ProjectNotFound if the project does not exist.
 * Returns InsufficientPermission if the caller is not the owner.
 * Deletes the project and all related tasks + assignees atomically.
 */
export const createDeleteProject: (
  deps: DeleteProjectDeps,
) => (params: DeleteProjectParams) => ResultAsync<void, AppError> = (deps) => (params) => {
  const { projectRepository } = deps
  const { userId, projectId } = params

  return projectRepository.findById({ id: projectId }).andThen((record) => {
    if (!record) {
      return errAsync(projectNotFound('Project not found'))
    }
    if (record.ownerId !== userId) {
      return errAsync(insufficientPermission('Only the owner can delete this project'))
    }
    return projectRepository.deleteWithCascade({ id: projectId })
  })
}
