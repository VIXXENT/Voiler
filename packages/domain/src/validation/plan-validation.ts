import { ok, err, type Result } from 'neverthrow'

import type { DomainError } from '../errors/domain-error'
import { projectLimitReached, memberLimitReached, taskLimitReached, projectFrozen } from '../errors/subscription-errors'
import type { PlanLimits } from '../plans/plan-definitions'

/** Parameters for checkProjectLimit. */
interface CheckProjectLimitParams {
  readonly currentCount: number
  readonly limits: PlanLimits
}

/** Parameters for checkMemberLimit. */
interface CheckMemberLimitParams {
  readonly currentCount: number
  readonly limits: PlanLimits
}

/** Parameters for checkTaskLimit. */
interface CheckTaskLimitParams {
  readonly currentCount: number
  readonly limits: PlanLimits
}

/** Parameters for checkNotFrozen. */
interface CheckNotFrozenParams {
  readonly frozen: boolean
}

/**
 * Check if adding one more project would exceed the plan limit.
 *
 * Returns ok(undefined) when the limit is -1 (unlimited) or currentCount is below the limit.
 * Returns err(ProjectLimitReached) when currentCount >= limit.
 */
export const checkProjectLimit: (params: CheckProjectLimitParams) => Result<void, DomainError> = ({
  currentCount,
  limits,
}) => {
  if (limits.maxProjects === -1 || currentCount < limits.maxProjects) {
    return ok(undefined)
  }
  return err(
    projectLimitReached(
      `Project limit of ${String(limits.maxProjects)} reached for this plan`,
    ),
  )
}

/**
 * Check if adding one more member would exceed the plan limit.
 *
 * Returns ok(undefined) when the limit is -1 (unlimited) or currentCount is below the limit.
 * Returns err(MemberLimitReached) when currentCount >= limit.
 */
export const checkMemberLimit: (params: CheckMemberLimitParams) => Result<void, DomainError> = ({
  currentCount,
  limits,
}) => {
  if (limits.maxMembersPerProject === -1 || currentCount < limits.maxMembersPerProject) {
    return ok(undefined)
  }
  return err(
    memberLimitReached(
      `Member limit of ${String(limits.maxMembersPerProject)} per project reached for this plan`,
    ),
  )
}

/**
 * Check if adding one more task would exceed the plan limit.
 *
 * Returns ok(undefined) when the limit is -1 (unlimited) or currentCount is below the limit.
 * Returns err(TaskLimitReached) when currentCount >= limit.
 */
export const checkTaskLimit: (params: CheckTaskLimitParams) => Result<void, DomainError> = ({
  currentCount,
  limits,
}) => {
  if (limits.maxTasksPerProject === -1 || currentCount < limits.maxTasksPerProject) {
    return ok(undefined)
  }
  return err(
    taskLimitReached(
      `Task limit of ${String(limits.maxTasksPerProject)} per project reached for this plan`,
    ),
  )
}

/**
 * Check if a project is frozen (subscription lapsed).
 *
 * Returns ok(undefined) when frozen is false.
 * Returns err(ProjectFrozen) when frozen is true.
 */
export const checkNotFrozen: (params: CheckNotFrozenParams) => Result<void, DomainError> = ({
  frozen,
}) => {
  if (!frozen) {
    return ok(undefined)
  }
  return err(projectFrozen('Project is frozen due to an inactive subscription'))
}
