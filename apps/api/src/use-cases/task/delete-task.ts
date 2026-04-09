import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ITaskAssigneeRepository,
  ITaskRepository,
} from '@voiler/core'
import {
  canPerformAction,
  notAMember,
  projectNotFound,
  resolveProjectRole,
  taskNotFound,
} from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the deleteTask use case.
 */
interface DeleteTaskDeps {
  readonly taskRepository: ITaskRepository
  readonly taskAssigneeRepository: ITaskAssigneeRepository
  readonly projectRepository: IProjectRepository
  readonly memberRepository: IProjectMemberRepository
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
 * Verifies the task exists, checks mutate permission via the task's project,
 * removes all assignees, then deletes the task record.
 */
export const createDeleteTask: (
  deps: DeleteTaskDeps,
) => (params: DeleteTaskParams) => ResultAsync<void, AppError> = (deps) => (params) => {
  const { taskRepository, taskAssigneeRepository, projectRepository, memberRepository } = deps
  const { userId, taskId } = params

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
          return taskAssigneeRepository
            .deleteByTask({ taskId })
            .andThen(() => taskRepository.delete({ id: taskId }))
        })
    })
  })
}
