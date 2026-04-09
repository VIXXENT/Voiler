import { ok, err, type Result } from 'neverthrow'

import type { DomainError } from '../errors/domain-error'
import { insufficientPermission } from '../errors/project-errors'

/** All roles a user can hold on a project. */
export type ProjectRole = 'owner' | 'member' | 'viewer'

/** Parameters for resolveProjectRole. */
interface ResolveProjectRoleParams {
  readonly userId: string
  readonly ownerId: string
  /** null means the user has no membership record for this project. */
  readonly membershipRole: 'member' | 'viewer' | null
}

/** Parameters for canPerformAction. */
interface CanPerformActionParams {
  readonly role: ProjectRole
  readonly action: 'read' | 'mutate' | 'admin'
}

/**
 * Determine a user's effective role on a project.
 *
 * Returns 'owner' if userId === ownerId, 'member'/'viewer' if they have membership,
 * null if not affiliated.
 *
 * @remarks
 * The `membershipRole` parameter should be the role from the ProjectMemberRecord for this user,
 * or null if they are not a member.
 */
export const resolveProjectRole: (params: ResolveProjectRoleParams) => ProjectRole | null = ({
  userId,
  ownerId,
  membershipRole,
}) => {
  if (userId === ownerId) {
    return 'owner'
  }
  if (membershipRole !== null) {
    return membershipRole
  }
  return null
}

/**
 * Check if a role can perform a given action.
 *
 * - owner: all actions (read, mutate, admin)
 * - member: read + mutate
 * - viewer: read only
 *
 * Returns Err(InsufficientPermission) when the role lacks the required access.
 */
export const canPerformAction: (params: CanPerformActionParams) => Result<void, DomainError> = ({
  role,
  action,
}) => {
  if (role === 'owner') {
    return ok(undefined)
  }
  if (role === 'member') {
    if (action === 'read' || action === 'mutate') {
      return ok(undefined)
    }
    return err(insufficientPermission(`Role 'member' cannot perform action '${action}'`))
  }
  // viewer
  if (action === 'read') {
    return ok(undefined)
  }
  return err(insufficientPermission(`Role 'viewer' cannot perform action '${action}'`))
}
