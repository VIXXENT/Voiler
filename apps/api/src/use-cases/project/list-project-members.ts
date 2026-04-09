import type { AppError, IProjectMemberRepository, IProjectRepository, ProjectMemberRecord } from '@voiler/core'
import { notAMember, projectNotFound } from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the listProjectMembers use case.
 */
interface ListProjectMembersDeps {
  readonly projectRepository: IProjectRepository
  readonly memberRepository: IProjectMemberRepository
}

/**
 * Parameters for listing members of a project.
 */
interface ListProjectMembersParams {
  readonly userId: string
  readonly projectId: string
}

/**
 * Factory that builds a use case for listing all members of a project.
 *
 * Only the project owner or current members can list the membership.
 */
export const createListProjectMembers: (
  deps: ListProjectMembersDeps,
) => (params: ListProjectMembersParams) => ResultAsync<ProjectMemberRecord[], AppError> =
  (deps) => (params) => {
    const { projectRepository, memberRepository } = deps
    const { userId, projectId } = params

    return projectRepository.findById({ id: projectId }).andThen((project) => {
      if (project === null) {
        return errAsync(projectNotFound(`Project ${projectId} not found`))
      }

      if (project.ownerId !== userId) {
        return memberRepository.findMembership({ projectId, userId }).andThen((membership) => {
          if (membership === null) {
            return errAsync(notAMember('You are not a member of this project'))
          }

          return memberRepository.findByProject({ projectId })
        })
      }

      return memberRepository.findByProject({ projectId })
    })
  }
