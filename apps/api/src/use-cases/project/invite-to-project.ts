import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ProjectMemberRecord,
} from '@voiler/core'
import {
  alreadyMember,
  insufficientPermission,
  projectNotFound,
  validateMemberRole,
} from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the inviteToProject use case.
 */
interface InviteToProjectDeps {
  readonly projectRepository: IProjectRepository
  readonly memberRepository: IProjectMemberRepository
}

/**
 * Parameters for inviting a user to a project.
 */
interface InviteToProjectParams {
  readonly userId: string
  readonly projectId: string
  readonly targetUserId: string
  readonly role: 'member' | 'viewer'
}

/**
 * Factory that builds a use case for inviting a user to a project.
 *
 * Only the project owner can invite members. Validates the role,
 * checks the target is not already a member, then adds the membership.
 */
export const createInviteToProject: (
  deps: InviteToProjectDeps,
) => (params: InviteToProjectParams) => ResultAsync<ProjectMemberRecord, AppError> =
  (deps) => (params) => {
    const { projectRepository, memberRepository } = deps
    const { userId, projectId, targetUserId, role } = params

    return projectRepository.findById({ id: projectId }).andThen((project) => {
      if (project === null) {
        return errAsync(projectNotFound(`Project ${projectId} not found`))
      }

      if (project.ownerId !== userId) {
        return errAsync(insufficientPermission('Only the owner can invite members'))
      }

      const roleResult = validateMemberRole({ role })
      if (roleResult.isErr()) {
        return errAsync(roleResult.error)
      }

      return memberRepository
        .findMembership({ projectId, userId: targetUserId })
        .andThen((existing) => {
          if (existing !== null) {
            return errAsync(alreadyMember('User is already a member'))
          }

          return memberRepository.addMember({
            data: {
              id: crypto.randomUUID(),
              projectId,
              userId: targetUserId,
              role,
              joinedAt: new Date(),
            },
          })
        })
    })
  }
