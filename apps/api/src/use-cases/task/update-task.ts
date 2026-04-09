import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ITaskRepository,
  TaskRecord,
} from '@voiler/core'
import {
  canPerformAction,
  notAMember,
  projectNotFound,
  resolveProjectRole,
  taskNotFound,
  validateTaskTitle,
} from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the updateTask use case.
 */
interface UpdateTaskDeps {
  readonly taskRepository: ITaskRepository
  readonly projectRepository: IProjectRepository
  readonly memberRepository: IProjectMemberRepository
}

/**
 * Parameters for updating an existing task.
 */
interface UpdateTaskParams {
  readonly userId: string
  readonly taskId: string
  readonly title?: string
  readonly description?: string
  readonly priority?: 'low' | 'medium' | 'high'
  readonly dueDate?: Date | null
}

/**
 * Factory that builds a use case for updating a task.
 *
 * Optionally validates the title if provided, verifies the task exists,
 * checks mutate permission via the task's project, then persists the updated fields.
 */
export const createUpdateTask: (
  deps: UpdateTaskDeps,
) => (params: UpdateTaskParams) => ResultAsync<TaskRecord, AppError> = (deps) => (params) => {
  const { taskRepository, projectRepository, memberRepository } = deps
  const { userId, taskId, title, description, priority, dueDate } = params

  let validatedTitle: string | undefined
  if (title !== undefined) {
    const titleResult = validateTaskTitle({ title })
    if (titleResult.isErr()) {
      return errAsync(titleResult.error)
    }
    validatedTitle = titleResult.value
  }

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
          return taskRepository.update({
            id: taskId,
            data: {
              ...(validatedTitle !== undefined ? { title: validatedTitle } : {}),
              ...(description !== undefined ? { description } : {}),
              ...(priority !== undefined ? { priority } : {}),
              ...(dueDate !== undefined ? { dueDate } : {}),
              updatedAt: new Date(),
            },
          })
        })
    })
  })
}
