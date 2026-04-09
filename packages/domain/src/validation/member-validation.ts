import { ok, err, type Result } from 'neverthrow'

import type { DomainError } from '../errors/domain-error'
import { invalidAssignment } from '../errors/project-errors'

/** Valid roles a project member can hold (owner is tracked on the project table). */
export type MemberRole = 'member' | 'viewer'

/** Parameters for validateMemberRole. */
interface ValidateMemberRoleParams {
  readonly role: string
}

/**
 * Validate a project member role.
 *
 * Only 'member' and 'viewer' are valid roles (owner is tracked on the project table).
 * Returns Err(InvalidAssignment) for any other value.
 */
export const validateMemberRole: (
  params: ValidateMemberRoleParams,
) => Result<MemberRole, DomainError> = ({ role }) => {
  if (role === 'member' || role === 'viewer') {
    return ok(role)
  }
  return err(invalidAssignment(`Invalid member role: '${role}'. Must be 'member' or 'viewer'`))
}
