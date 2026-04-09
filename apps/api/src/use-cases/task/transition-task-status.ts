import type { AppError, ITaskRepository, TaskRecord } from '@voiler/core'
import { canTransitionStatus, taskNotFound } from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the transitionTaskStatus use case.
 */
interface TransitionTaskStatusDeps {
  readonly taskRepository: ITaskRepository
}

/**
 * Parameters for transitioning a task's status.
 */
interface TransitionTaskStatusParams {
  readonly userId: string
  readonly taskId: string
  readonly newStatus: 'todo' | 'in_progress' | 'done'
}

/**
 * Factory that builds a use case for transitioning a task's status.
 *
 * Verifies the task exists, validates the transition via domain rules,
 * then persists the new status with a fresh updatedAt timestamp.
 */
export const createTransitionTaskStatus: (
  deps: TransitionTaskStatusDeps,
) => (params: TransitionTaskStatusParams) => ResultAsync<TaskRecord, AppError> =
  (deps) => (params) => {
    const { taskRepository } = deps
    const { taskId, newStatus } = params

    return taskRepository.findById({ id: taskId }).andThen((task) => {
      if (!task) {
        return errAsync(taskNotFound('Task not found'))
      }

      const transitionResult = canTransitionStatus({ from: task.status, to: newStatus })
      if (transitionResult.isErr()) {
        return errAsync(transitionResult.error)
      }

      return taskRepository.update({
        id: taskId,
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      })
    })
  }
