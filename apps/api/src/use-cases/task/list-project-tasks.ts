import type {
  AppError,
  IProjectRepository,
  ITaskRepository,
  TaskFilters,
  TaskRecord,
} from '@voiler/core'
import { projectNotFound } from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the listProjectTasks use case.
 */
interface ListProjectTasksDeps {
  readonly projectRepository: IProjectRepository
  readonly taskRepository: ITaskRepository
}

/**
 * Parameters for listing tasks in a project.
 */
interface ListProjectTasksParams {
  readonly userId: string
  readonly projectId: string
  readonly filters?: TaskFilters
}

/**
 * Factory that builds a use case for listing all tasks in a project.
 *
 * Verifies the project exists, then returns all tasks matching the optional filters.
 */
export const createListProjectTasks: (
  deps: ListProjectTasksDeps,
) => (params: ListProjectTasksParams) => ResultAsync<TaskRecord[], AppError> =
  (deps) => (params) => {
    const { projectRepository, taskRepository } = deps
    const { projectId, filters } = params

    return projectRepository.findById({ id: projectId }).andThen((project) => {
      if (!project) {
        return errAsync(projectNotFound('Project not found'))
      }
      return taskRepository.findByProject({ projectId, filters })
    })
  }
