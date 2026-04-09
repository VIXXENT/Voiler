import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ITaskAssigneeRepository,
  ITaskRepository,
  TaskAssigneeRecord,
} from '@voiler/core'
import {
  canAssignResponsible,
  canPerformAction,
  notAMember,
  projectNotFound,
  resolveProjectRole,
  taskNotFound,
} from '@voiler/domain'
import { errAsync, okAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the assignToTask use case.
 */
interface AssignToTaskDeps {
  readonly taskRepository: ITaskRepository
  readonly taskAssigneeRepository: ITaskAssigneeRepository
  readonly projectRepository: IProjectRepository
  readonly memberRepository: IProjectMemberRepository
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
 * Verifies the task exists, checks mutate permission via the task's project.
 * If assigning the 'responsible' role, checks there is no conflicting responsible.
 * Then creates the assignment record.
 */
export const createAssignToTask: (
  deps: AssignToTaskDeps,
) => (params: AssignToTaskParams) => ResultAsync<TaskAssigneeRecord, AppError> =
  (deps) => (params) => {
    const { taskRepository, taskAssigneeRepository, projectRepository, memberRepository } = deps
    const { userId, taskId, targetUserId, role } = params

    return taskRepository
      .findById({ id: taskId })
      .andThen((task) => {
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
              const projectRole = resolveProjectRole({
                userId,
                ownerId: project.ownerId,
                membershipRole: membership?.role ?? null,
              })
              if (projectRole === null) {
                return errAsync(notAMember('You are not a member of this project'))
              }
              const permResult = canPerformAction({ role: projectRole, action: 'mutate' })
              if (permResult.isErr()) {
                return errAsync(permResult.error)
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
