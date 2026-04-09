import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ITaskRepository,
  TaskRecord,
} from '@voiler/core'
import {
  canPerformAction,
  canTransitionStatus,
  notAMember,
  projectNotFound,
  resolveProjectRole,
  taskNotFound,
} from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the transitionTaskStatus use case.
 */
interface TransitionTaskStatusDeps {
  readonly taskRepository: ITaskRepository
  readonly projectRepository: IProjectRepository
  readonly memberRepository: IProjectMemberRepository
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
 * Verifies the task exists, checks mutate permission via the task's project,
 * validates the transition via domain rules, then persists the new status.
 */
export const createTransitionTaskStatus: (
  deps: TransitionTaskStatusDeps,
) => (params: TransitionTaskStatusParams) => ResultAsync<TaskRecord, AppError> =
  (deps) => (params) => {
    const { taskRepository, projectRepository, memberRepository } = deps
    const { userId, taskId, newStatus } = params

    return taskRepository.findById({ id: taskId }).andThen((task) => {
      if (!task) {
        return errAsync(taskNotFound('Task not found'))
      }

      return projectRepository.findById({ id: task.projectId }).andThen((project) => {
        if (!project) {
          return errAsync(projectNotFound('Project not found'))
        }
        return memberRepository
          .findMembership({ projectId: task.projectId, userId })
          .andThen((membership) => {
            const role = resolveProjectRole({
              userId,
              ownerId: project.ownerId,
              membershipRole: membership?.role ?? null,
            })
            if (role === null) {
              return errAsync(notAMember('You are not a member of this project'))
            }
            const permResult = canPerformAction({ role, action: 'mutate' })
            if (permResult.isErr()) {
              return errAsync(permResult.error)
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
      })
    })
  }
