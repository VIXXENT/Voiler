import type { AppError, IProjectRepository, ProjectRecord } from '@voiler/core'
import type { ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the createProject use case.
 */
interface CreateProjectDeps {
  readonly projectRepository: IProjectRepository
}

/**
 * Parameters for creating a new project.
 */
interface CreateProjectParams {
  readonly name: string
  readonly description?: string
  readonly ownerId: string
}

/**
 * Factory that builds a use case for creating a new project.
 */
export const createCreateProject: (
  deps: CreateProjectDeps,
) => (params: CreateProjectParams) => ResultAsync<ProjectRecord, AppError> = (deps) => (params) => {
  return deps.projectRepository.create({
    data: {
      name: params.name,
      description: params.description,
      ownerId: params.ownerId,
    },
  })
}
