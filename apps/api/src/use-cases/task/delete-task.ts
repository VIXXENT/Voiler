import type { AppError, ITaskRepository } from '@voiler/core'
import { taskNotFound } from '@voiler/domain'
import { errAsync } from 'neverthrow'
import type { ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the deleteTask use case.
 */
interface DeleteTaskDeps {
  readonly taskRepository: ITaskRepository
}

/**
 * Parameters for deleting a task.
 */
interface DeleteTaskParams {
  readonly taskId: string
}

/**
 * Factory that builds a use case for deleting a task and its assignees.
 */
export const createDeleteTask: (
  deps: DeleteTaskDeps,
) => (params: DeleteTaskParams) => ResultAsync<void, AppError> = (deps) => (params) => {
  return deps.taskRepository.findById({ id: params.taskId }).andThen((task) => {
    if (!task) {
      return errAsync(taskNotFound(`Task '${params.taskId}' not found`))
    }

    return deps.taskRepository.delete({ id: params.taskId }).map(() => undefined)
  })
}
