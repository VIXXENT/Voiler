import type { AppError, IProjectMemberRepository, IProjectRepository } from '@voiler/core'
import {
  cannotRemoveOwner,
  insufficientPermission,
  memberNotFound,
  projectNotFound,
} from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the removeFromProject use case.
 */
interface RemoveFromProjectDeps {
  readonly projectRepository: IProjectRepository
  readonly memberRepository: IProjectMemberRepository
}

/**
 * Parameters for removing a user from a project.
 */
interface RemoveFromProjectParams {
  readonly userId: string
  readonly projectId: string
  readonly targetUserId: string
}

/**
 * Factory that builds a use case for removing a member from a project.
 *
 * The project owner cannot be removed. Only the owner or the member
 * themselves can perform the removal.
 */
export const createRemoveFromProject: (
  deps: RemoveFromProjectDeps,
) => (params: RemoveFromProjectParams) => ResultAsync<void, AppError> =
  (deps) => (params) => {
    const { projectRepository, memberRepository } = deps
    const { userId, projectId, targetUserId } = params

    return projectRepository.findById({ id: projectId }).andThen((project) => {
      if (project === null) {
        return errAsync(projectNotFound(`Project ${projectId} not found`))
      }

      if (targetUserId === project.ownerId) {
        return errAsync(cannotRemoveOwner('Cannot remove the project owner'))
      }

      if (userId !== project.ownerId && userId !== targetUserId) {
        return errAsync(insufficientPermission('Only the owner or the member themselves can remove a member'))
      }

      return memberRepository.findMembership({ projectId, userId: targetUserId }).andThen((membership) => {
        if (membership === null) {
          return errAsync(memberNotFound(`User ${targetUserId} is not a member of this project`))
        }

        return memberRepository.removeMember({ projectId, userId: targetUserId })
      })
    })
  }
