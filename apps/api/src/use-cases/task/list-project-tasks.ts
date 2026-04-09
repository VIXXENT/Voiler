import type {
  AppError,
  IProjectRepository,
  ITaskRepository,
  ListTasksFilters,
  TaskRecord,
} from '@voiler/core'
import { projectNotFound } from '@voiler/domain'
import { errAsync } from 'neverthrow'
import type { ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the listProjectTasks use case.
 */
interface ListProjectTasksDeps {
  readonly taskRepository: ITaskRepository
  readonly projectRepository: IProjectRepository
}

/**
 * Parameters for listing tasks in a project.
 */
interface ListProjectTasksParams {
  readonly projectId: string
  readonly filters?: ListTasksFilters
}

/**
 * Factory that builds a use case for listing all tasks in a project.
 */
export const createListProjectTasks: (
  deps: ListProjectTasksDeps,
) => (params: ListProjectTasksParams) => ResultAsync<TaskRecord[], AppError> =
  (deps) => (params) => {
    return deps.projectRepository.findById({ id: params.projectId }).andThen((project) => {
      if (!project) {
        return errAsync(projectNotFound(`Project '${params.projectId}' not found`))
      }

      return deps.taskRepository.findByProject({
        projectId: params.projectId,
        filters: params.filters,
      })
    })
  }
