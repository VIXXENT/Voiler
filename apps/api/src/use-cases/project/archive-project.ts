import type { AppError, IProjectRepository, ProjectRecord } from '@voiler/core'
import { insufficientPermission, projectNotFound } from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the archiveProject use case.
 */
interface ArchiveProjectDeps {
  readonly projectRepository: IProjectRepository
}

/**
 * Parameters for archiving a project.
 */
interface ArchiveProjectParams {
  readonly userId: string
  readonly projectId: string
}

/**
 * Factory that builds a use case for archiving a project.
 *
 * Returns ProjectNotFound if the project does not exist.
 * Returns InsufficientPermission if the caller is not the owner.
 * Updates the project status to 'archived'.
 */
export const createArchiveProject: (
  deps: ArchiveProjectDeps,
) => (params: ArchiveProjectParams) => ResultAsync<ProjectRecord, AppError> =
  (deps) => (params) => {
    const { projectRepository } = deps
    const { userId, projectId } = params

    return projectRepository.findById({ id: projectId }).andThen((record) => {
      if (!record) {
        return errAsync(projectNotFound('Project not found'))
      }
      if (record.ownerId !== userId) {
        return errAsync(insufficientPermission('Only the owner can archive this project'))
      }
      return projectRepository.update({
        id: projectId,
        data: { status: 'archived', updatedAt: new Date() },
      })
    })
  }
