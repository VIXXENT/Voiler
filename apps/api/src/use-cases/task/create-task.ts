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
  validateTaskTitle,
} from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the createTask use case.
 */
interface CreateTaskDeps {
  readonly projectRepository: IProjectRepository
  readonly taskRepository: ITaskRepository
  readonly memberRepository: IProjectMemberRepository
}

/**
 * Parameters for creating a new task.
 */
interface CreateTaskParams {
  readonly userId: string
  readonly projectId: string
  readonly title: string
  readonly description?: string
  readonly priority?: 'low' | 'medium' | 'high'
  readonly dueDate?: Date
}

/**
 * Factory that builds a use case for creating a new task.
 *
 * Validates the task title, verifies the project exists, checks mutate permission,
 * then persists the task with status 'todo' and the given userId as creator.
 */
export const createCreateTask: (
  deps: CreateTaskDeps,
) => (params: CreateTaskParams) => ResultAsync<TaskRecord, AppError> = (deps) => (params) => {
  const { projectRepository, taskRepository, memberRepository } = deps
  const { userId, projectId, title, description, priority, dueDate } = params

  const titleResult = validateTaskTitle({ title })
  if (titleResult.isErr()) {
    return errAsync(titleResult.error)
  }

  return projectRepository.findById({ id: projectId }).andThen((project) => {
    if (!project) {
      return errAsync(projectNotFound('Project not found'))
    }
    return memberRepository.findMembership({ projectId, userId }).andThen((membership) => {
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
      return taskRepository.create({
        data: {
          id: crypto.randomUUID(),
          projectId,
          title: titleResult.value,
          description,
          priority,
          dueDate,
          createdBy: userId,
        },
      })
    })
  })
}
