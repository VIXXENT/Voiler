import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ITaskRepository,
  TaskFilters,
  TaskRecord,
} from '@voiler/core'
import {
  canPerformAction,
  notAMember,
  projectNotFound,
  resolveProjectRole,
} from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the listProjectTasks use case.
 */
interface ListProjectTasksDeps {
  readonly projectRepository: IProjectRepository
  readonly taskRepository: ITaskRepository
  readonly memberRepository: IProjectMemberRepository
}

/**
 * Parameters for listing tasks in a project.
 */
interface ListProjectTasksParams {
  readonly userId: string
  readonly projectId: string
  readonly filters?: TaskFilters
}

/**
 * Factory that builds a use case for listing all tasks in a project.
 *
 * Verifies the project exists, checks read permission,
 * then returns all tasks matching the optional filters.
 */
export const createListProjectTasks: (
  deps: ListProjectTasksDeps,
) => (params: ListProjectTasksParams) => ResultAsync<TaskRecord[], AppError> =
  (deps) => (params) => {
    const { projectRepository, taskRepository, memberRepository } = deps
    const { userId, projectId, filters } = params

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
        const permResult = canPerformAction({ role, action: 'read' })
        if (permResult.isErr()) {
          return errAsync(permResult.error)
        }
        return taskRepository.findByProject({ projectId, filters })
      })
    })
  }
