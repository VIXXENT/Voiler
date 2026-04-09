import type { AppError, IProjectRepository, ProjectRecord } from '@voiler/core'
import { projectNotFound } from '@voiler/domain'
import { errAsync, okAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the getProject use case.
 */
interface GetProjectDeps {
  readonly projectRepository: IProjectRepository
}

/**
 * Parameters for retrieving a project by ID.
 */
interface GetProjectParams {
  readonly userId: string
  readonly projectId: string
}

/**
 * Factory that builds a use case for retrieving a single project by ID.
 *
 * Returns ProjectNotFound if the record does not exist.
 */
export const createGetProject: (
  deps: GetProjectDeps,
) => (params: GetProjectParams) => ResultAsync<ProjectRecord, AppError> =
  (deps) => (params) => {
    const { projectRepository } = deps
    const { projectId } = params

    return projectRepository.findById({ id: projectId }).andThen((record) => {
      if (!record) {
        return errAsync(projectNotFound('Project not found'))
      }
      return okAsync(record)
    })
  }
