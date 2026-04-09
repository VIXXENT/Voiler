import type { AppError, IProjectRepository, ITaskRepository, TaskRecord } from '@voiler/core'
import { invalidTaskTitle, projectNotFound } from '@voiler/domain'
import { errAsync } from 'neverthrow'
import type { ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the createTask use case.
 */
interface CreateTaskDeps {
  readonly taskRepository: ITaskRepository
  readonly projectRepository: IProjectRepository
}

/**
 * Parameters for creating a new task.
 */
interface CreateTaskParams {
  readonly title: string
  readonly description?: string
  readonly priority?: 'low' | 'medium' | 'high'
  readonly projectId: string
  readonly createdBy: string
}

/**
 * Factory that builds a use case for creating a new task.
 */
export const createCreateTask: (
  deps: CreateTaskDeps,
) => (params: CreateTaskParams) => ResultAsync<TaskRecord, AppError> = (deps) => (params) => {
  if (!params.title.trim()) {
    return errAsync(invalidTaskTitle('Task title cannot be empty'))
  }

  return deps.projectRepository.findById({ id: params.projectId }).andThen((project) => {
    if (!project) {
      return errAsync(projectNotFound(`Project '${params.projectId}' not found`))
    }

    return deps.taskRepository.create({
      data: {
        title: params.title.trim(),
        description: params.description,
        priority: params.priority ?? 'medium',
        projectId: params.projectId,
        createdBy: params.createdBy,
      },
    })
  })
}
