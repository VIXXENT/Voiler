import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ProjectMemberRecord,
} from '@voiler/core'
import {
  cannotRemoveOwner,
  insufficientPermission,
  memberNotFound,
  projectNotFound,
  validateMemberRole,
} from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the updateMemberRole use case.
 */
interface UpdateMemberRoleDeps {
  readonly projectRepository: IProjectRepository
  readonly memberRepository: IProjectMemberRepository
}

/**
 * Parameters for updating a project member's role.
 */
interface UpdateMemberRoleParams {
  readonly userId: string
  readonly projectId: string
  readonly targetUserId: string
  readonly newRole: 'member' | 'viewer'
}

/**
 * Factory that builds a use case for updating a project member's role.
 *
 * Only the project owner can change roles. The owner's own role cannot
 * be changed. The target must already be a member.
 */
export const createUpdateMemberRole: (
  deps: UpdateMemberRoleDeps,
) => (params: UpdateMemberRoleParams) => ResultAsync<ProjectMemberRecord, AppError> =
  (deps) => (params) => {
    const { projectRepository, memberRepository } = deps
    const { userId, projectId, targetUserId, newRole } = params

    return projectRepository.findById({ id: projectId }).andThen((project) => {
      if (project === null) {
        return errAsync(projectNotFound(`Project ${projectId} not found`))
      }

      if (userId !== project.ownerId) {
        return errAsync(insufficientPermission('Only the owner can change member roles'))
      }

      if (targetUserId === project.ownerId) {
        return errAsync(cannotRemoveOwner('Cannot change the role of the project owner'))
      }

      const roleResult = validateMemberRole({ role: newRole })
      if (roleResult.isErr()) {
        return errAsync(roleResult.error)
      }

      return memberRepository
        .findMembership({ projectId, userId: targetUserId })
        .andThen((membership) => {
          if (membership === null) {
            return errAsync(memberNotFound(`User ${targetUserId} is not a member of this project`))
          }

          return memberRepository.updateRole({ projectId, userId: targetUserId, role: newRole })
        })
    })
  }
