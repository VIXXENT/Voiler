import type { AppError, IProjectRepository, ProjectRecord } from '@voiler/core'
import { validateProjectName } from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

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
  readonly userId: string
  readonly name: string
  readonly description?: string
}

/**
 * Factory that builds a use case for creating a new project.
 *
 * Validates the project name, then persists the project with
 * the given userId as owner, status 'active', and frozen = false.
 */
export const createCreateProject: (
  deps: CreateProjectDeps,
) => (params: CreateProjectParams) => ResultAsync<ProjectRecord, AppError> = (deps) => (params) => {
  const { projectRepository } = deps
  const { userId, name, description } = params

  const validationResult = validateProjectName({ name })
  if (validationResult.isErr()) {
    return errAsync(validationResult.error)
  }

  return projectRepository.create({
    data: {
      id: crypto.randomUUID(),
      name: validationResult.value,
      description,
      ownerId: userId,
    },
  })
}
