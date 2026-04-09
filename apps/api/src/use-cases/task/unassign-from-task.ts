import type { AppError, ITaskRepository } from '@voiler/core'
import { taskNotFound } from '@voiler/domain'
import { errAsync } from 'neverthrow'
import type { ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the unassignFromTask use case.
 */
interface UnassignFromTaskDeps {
  readonly taskRepository: ITaskRepository
}

/**
 * Parameters for removing a user assignment from a task.
 */
interface UnassignFromTaskParams {
  readonly taskId: string
  readonly userId: string
}

/**
 * Factory that builds a use case for removing a user from a task.
 */
export const createUnassignFromTask: (
  deps: UnassignFromTaskDeps,
) => (params: UnassignFromTaskParams) => ResultAsync<void, AppError> = (deps) => (params) => {
  return deps.taskRepository.findById({ id: params.taskId }).andThen((task) => {
    if (!task) {
      return errAsync(taskNotFound(`Task '${params.taskId}' not found`))
    }

    return deps.taskRepository
      .unassignUser({ taskId: params.taskId, userId: params.userId })
      .map(() => undefined)
  })
}
