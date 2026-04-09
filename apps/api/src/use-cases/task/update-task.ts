import type { AppError, ITaskRepository, TaskRecord } from '@voiler/core'
import { invalidTaskTitle, taskNotFound } from '@voiler/domain'
import { errAsync } from 'neverthrow'
import type { ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the updateTask use case.
 */
interface UpdateTaskDeps {
  readonly taskRepository: ITaskRepository
}

/**
 * Parameters for updating a task.
 */
interface UpdateTaskParams {
  readonly taskId: string
  readonly title?: string
  readonly description?: string
  readonly priority?: 'low' | 'medium' | 'high'
}

/**
 * Factory that builds a use case for updating a task.
 */
export const createUpdateTask: (
  deps: UpdateTaskDeps,
) => (params: UpdateTaskParams) => ResultAsync<TaskRecord, AppError> = (deps) => (params) => {
  if (params.title !== undefined && !params.title.trim()) {
    return errAsync(invalidTaskTitle('Task title cannot be empty'))
  }

  return deps.taskRepository.findById({ id: params.taskId }).andThen((task) => {
    if (!task) {
      return errAsync(taskNotFound(`Task '${params.taskId}' not found`))
    }

    return deps.taskRepository.update({
      id: params.taskId,
      data: {
        title: params.title?.trim(),
        description: params.description,
        priority: params.priority,
      },
    })
  })
}
