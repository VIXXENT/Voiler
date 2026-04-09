import type { AppError, ITaskRepository, TaskRecord } from '@voiler/core'
import { taskNotFound, validateTaskTitle } from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the updateTask use case.
 */
interface UpdateTaskDeps {
  readonly taskRepository: ITaskRepository
}

/**
 * Parameters for updating an existing task.
 */
interface UpdateTaskParams {
  readonly userId: string
  readonly taskId: string
  readonly title?: string
  readonly description?: string
  readonly priority?: 'low' | 'medium' | 'high'
  readonly dueDate?: Date | null
}

/**
 * Factory that builds a use case for updating a task.
 *
 * Optionally validates the title if provided, verifies the task exists,
 * then persists the updated fields with a fresh updatedAt timestamp.
 */
export const createUpdateTask: (
  deps: UpdateTaskDeps,
) => (params: UpdateTaskParams) => ResultAsync<TaskRecord, AppError> = (deps) => (params) => {
  const { taskRepository } = deps
  const { taskId, title, description, priority, dueDate } = params

  if (title !== undefined) {
    const titleResult = validateTaskTitle({ title })
    if (titleResult.isErr()) {
      return errAsync(titleResult.error)
    }

    return taskRepository.findById({ id: taskId }).andThen((task) => {
      if (!task) {
        return errAsync(taskNotFound('Task not found'))
      }
      return taskRepository.update({
        id: taskId,
        data: {
          title: titleResult.value,
          ...(description !== undefined ? { description } : {}),
          ...(priority !== undefined ? { priority } : {}),
          ...(dueDate !== undefined ? { dueDate } : {}),
          updatedAt: new Date(),
        },
      })
    })
  }

  return taskRepository.findById({ id: taskId }).andThen((task) => {
    if (!task) {
      return errAsync(taskNotFound('Task not found'))
    }
    return taskRepository.update({
      id: taskId,
      data: {
        ...(description !== undefined ? { description } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
        updatedAt: new Date(),
      },
    })
  })
}
