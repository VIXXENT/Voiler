import type { AppError, ITaskAssigneeRepository, ITaskRepository } from '@voiler/core'
import { taskNotFound } from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the unassignFromTask use case.
 */
interface UnassignFromTaskDeps {
  readonly taskRepository: ITaskRepository
  readonly taskAssigneeRepository: ITaskAssigneeRepository
}

/**
 * Parameters for unassigning a user from a task.
 */
interface UnassignFromTaskParams {
  readonly userId: string
  readonly taskId: string
  readonly targetUserId: string
}

/**
 * Factory that builds a use case for removing a user's assignment from a task.
 *
 * Verifies the task exists, then removes the target user's assignment.
 */
export const createUnassignFromTask: (
  deps: UnassignFromTaskDeps,
) => (params: UnassignFromTaskParams) => ResultAsync<void, AppError> = (deps) => (params) => {
  const { taskRepository, taskAssigneeRepository } = deps
  const { taskId, targetUserId } = params

  return taskRepository.findById({ id: taskId }).andThen((task) => {
    if (!task) {
      return errAsync(taskNotFound('Task not found'))
    }
    return taskAssigneeRepository.unassign({ taskId, userId: targetUserId })
  })
}
