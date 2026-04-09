import type {
  AppError,
  IProjectMemberRepository,
  IProjectRepository,
  ProjectRecord,
} from '@voiler/core'
import { canPerformAction, notAMember, projectNotFound, resolveProjectRole } from '@voiler/domain'
import { errAsync, okAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the getProject use case.
 */
interface GetProjectDeps {
  readonly projectRepository: IProjectRepository
  readonly memberRepository: IProjectMemberRepository
}

/**
 * Parameters for retrieving a project by ID.
 */
interface GetProjectParams {
  readonly userId: string
  readonly projectId: string
}

/**
 * Factory that builds a use case for retrieving a single project by ID.
 *
 * Returns ProjectNotFound if the record does not exist.
 * Returns NotAMember if the user has no access to the project.
 * Returns InsufficientPermission if the user's role cannot read.
 */
export const createGetProject: (
  deps: GetProjectDeps,
) => (params: GetProjectParams) => ResultAsync<ProjectRecord, AppError> = (deps) => (params) => {
  const { projectRepository, memberRepository } = deps
  const { projectId, userId } = params

  return projectRepository.findById({ id: projectId }).andThen((record) => {
    if (!record) {
      return errAsync(projectNotFound('Project not found'))
    }
    return memberRepository.findMembership({ projectId, userId }).andThen((membership) => {
      const role = resolveProjectRole({
        userId,
        ownerId: record.ownerId,
        membershipRole: membership?.role ?? null,
      })
      if (role === null) {
        return errAsync(notAMember('You are not a member of this project'))
      }
      const permResult = canPerformAction({ role, action: 'read' })
      if (permResult.isErr()) {
        return errAsync(permResult.error)
      }
      return okAsync(record)
    })
  })
}
