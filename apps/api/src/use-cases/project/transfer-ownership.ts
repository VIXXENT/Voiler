import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ProjectRecord,
} from '@voiler/core'
import { insufficientPermission, memberNotFound, projectNotFound } from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the transferOwnership use case.
 */
interface TransferOwnershipDeps {
  readonly projectRepository: IProjectRepository
  readonly memberRepository: IProjectMemberRepository
}

/**
 * Parameters for transferring project ownership.
 */
interface TransferOwnershipParams {
  readonly userId: string
  readonly projectId: string
  readonly newOwnerId: string
}

/**
 * Factory that builds a use case for transferring project ownership.
 *
 * The new owner must be a current member. The old owner becomes a regular
 * member after the transfer.
 *
 * @remarks
 * The 3-step mutation (removeMember → addMember → update project) is NOT atomic.
 * A failure mid-chain may leave the project in an inconsistent state (e.g. new owner
 * removed from members but ownerId not yet updated). A transactional adapter should
 * be used for production hardening — tracked as a future improvement.
 */
export const createTransferOwnership: (
  deps: TransferOwnershipDeps,
) => (params: TransferOwnershipParams) => ResultAsync<ProjectRecord, AppError> =
  (deps) => (params) => {
    const { projectRepository, memberRepository } = deps
    const { userId, projectId, newOwnerId } = params

    return projectRepository.findById({ id: projectId }).andThen((project) => {
      if (project === null) {
        return errAsync(projectNotFound(`Project ${projectId} not found`))
      }

      if (userId !== project.ownerId) {
        return errAsync(insufficientPermission('Only the owner can transfer ownership'))
      }

      return memberRepository
        .findMembership({ projectId, userId: newOwnerId })
        .andThen((membership) => {
          if (membership === null) {
            return errAsync(memberNotFound('New owner must be a current member'))
          }

          const oldOwnerId = project.ownerId

          return memberRepository
            .removeMember({ projectId, userId: newOwnerId })
            .andThen(() =>
              memberRepository.addMember({
                data: {
                  id: crypto.randomUUID(),
                  projectId,
                  userId: oldOwnerId,
                  role: 'member',
                  joinedAt: new Date(),
                },
              }),
            )
            .andThen(() =>
              projectRepository.update({
                id: projectId,
                data: { ownerId: newOwnerId, updatedAt: new Date() },
              }),
            )
        })
    })
  }
