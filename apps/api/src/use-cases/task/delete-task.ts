import type { AppError, ITaskAssigneeRepository, ITaskRepository } from '@voiler/core'
import { taskNotFound } from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the deleteTask use case.
 */
interface DeleteTaskDeps {
  readonly taskRepository: ITaskRepository
  readonly taskAssigneeRepository: ITaskAssigneeRepository
}

/**
 * Parameters for deleting a task.
 */
interface DeleteTaskParams {
  readonly userId: string
  readonly taskId: string
}

/**
 * Factory that builds a use case for deleting a task.
 *
 * Verifies the task exists, removes all assignees first,
 * then deletes the task record.
 */
export const createDeleteTask: (
  deps: DeleteTaskDeps,
) => (params: DeleteTaskParams) => ResultAsync<void, AppError> = (deps) => (params) => {
  const { taskRepository, taskAssigneeRepository } = deps
  const { taskId } = params

  return taskRepository.findById({ id: taskId }).andThen((task) => {
    if (!task) {
      return errAsync(taskNotFound('Task not found'))
    }
    return taskAssigneeRepository
      .deleteByTask({ taskId })
      .andThen(() => taskRepository.delete({ id: taskId }))
  })
}
