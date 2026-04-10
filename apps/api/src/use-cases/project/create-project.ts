import type { AppError, IProjectRepository, IUserSubscriptionRepository, ProjectRecord } from '@voiler/core'
import { PLAN_LIMITS, checkProjectLimit, validateProjectName } from '@voiler/domain'
import type { PlanId } from '@voiler/domain'
import { errAsync, type ResultAsync } from 'neverthrow'

/**
 * Dependencies injected into the createProject use case.
 */
interface CreateProjectDeps {
  readonly projectRepository: IProjectRepository
  readonly subscriptionRepository: IUserSubscriptionRepository
}

/**
 * Parameters for creating a new project.
 */
interface CreateProjectParams {
  readonly userId: string
  readonly name: string
  readonly description?: string
}

/**
 * Factory that builds a use case for creating a new project.
 *
 * Validates the project name, checks the user's plan project limit,
 * then persists the project with the given userId as owner, status 'active', and frozen = false.
 */
export const createCreateProject: (
  deps: CreateProjectDeps,
) => (params: CreateProjectParams) => ResultAsync<ProjectRecord, AppError> = (deps) => (params) => {
  const { projectRepository, subscriptionRepository } = deps
  const { userId, name, description } = params

  const validationResult = validateProjectName({ name })
  if (validationResult.isErr()) {
    return errAsync(validationResult.error)
  }

  return subscriptionRepository.findByUser({ userId }).andThen((sub) =>
    projectRepository.countByOwner({ ownerId: userId }).andThen((count) => {
      const plan: PlanId = sub?.plan ?? 'free'
      const limitResult = checkProjectLimit({ currentCount: count, limits: PLAN_LIMITS[plan] })
      if (limitResult.isErr()) {
        return errAsync(limitResult.error)
      }
      return projectRepository.create({
        data: {
          id: crypto.randomUUID(),
          name: validationResult.value,
          description,
          ownerId: userId,
        },
      })
    }),
  )
}
