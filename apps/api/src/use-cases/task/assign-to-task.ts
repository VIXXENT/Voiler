import type { AppError, ITaskRepository, TaskAssigneeRecord } from '@voiler/core'
import { taskNotFound } from '@voiler/domain'
import { errAsync } from 'neverthrow'
import type { ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the assignToTask use case.
 */
interface AssignToTaskDeps {
  readonly taskRepository: ITaskRepository
}

/**
 * Parameters for assigning a user to a task.
 */
interface AssignToTaskParams {
  readonly taskId: string
  readonly userId: string
}

/**
 * Factory that builds a use case for assigning a user to a task.
 */
export const createAssignToTask: (
  deps: AssignToTaskDeps,
) => (params: AssignToTaskParams) => ResultAsync<TaskAssigneeRecord, AppError> =
  (deps) => (params) => {
    return deps.taskRepository.findById({ id: params.taskId }).andThen((task) => {
      if (!task) {
        return errAsync(taskNotFound(`Task '${params.taskId}' not found`))
      }

      return deps.taskRepository.assignUser({
        taskId: params.taskId,
        userId: params.userId,
      })
    })
  }
