import type {
  AppError,
  ITaskAssigneeRepository,
  ITaskRepository,
  TaskAssigneeRecord,
} from '@voiler/core'
import { canAssignResponsible, taskNotFound } from '@voiler/domain'
import { errAsync, okAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the assignToTask use case.
 */
interface AssignToTaskDeps {
  readonly taskRepository: ITaskRepository
  readonly taskAssigneeRepository: ITaskAssigneeRepository
}

/**
 * Parameters for assigning a user to a task.
 */
interface AssignToTaskParams {
  readonly userId: string
  readonly taskId: string
  readonly targetUserId: string
  readonly role: 'responsible' | 'reviewer' | 'collaborator'
}

/**
 * Factory that builds a use case for assigning a user to a task.
 *
 * Verifies the task exists. If assigning the 'responsible' role,
 * checks there is no conflicting responsible already assigned.
 * Then creates the assignment record.
 */
export const createAssignToTask: (
  deps: AssignToTaskDeps,
) => (params: AssignToTaskParams) => ResultAsync<TaskAssigneeRecord, AppError> =
  (deps) => (params) => {
    const { taskRepository, taskAssigneeRepository } = deps
    const { taskId, targetUserId, role } = params

    return taskRepository
      .findById({ id: taskId })
      .andThen((task) => {
        if (!task) {
          return errAsync(taskNotFound('Task not found'))
        }
        if (role !== 'responsible') {
          return okAsync(null)
        }
        return taskAssigneeRepository.findResponsible({ taskId }).andThen((responsible) => {
          const assignResult = canAssignResponsible({
            currentResponsibleUserId: responsible?.userId ?? null,
            newUserId: targetUserId,
          })
          if (assignResult.isErr()) {
            return errAsync(assignResult.error)
          }
          return okAsync(null)
        })
      })
      .andThen(() =>
        taskAssigneeRepository.assign({
          data: {
            id: crypto.randomUUID(),
            taskId,
            userId: targetUserId,
            role,
            assignedAt: new Date(),
          },
        }),
      )
  }
