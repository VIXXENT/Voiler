import { ok, err, type Result } from 'neverthrow'
import type { DomainError } from '../errors/domain-error'
import { invalidAssignment } from '../errors/project-errors'

/** Parameters for canAssignResponsible. */
type CanAssignResponsibleParams = {
  readonly currentResponsibleUserId: string | null
  readonly newUserId: string
}

/**
 * Validate that a responsible user can be assigned to a task.
 *
 * Assigning the same user again is idempotent and always allowed.
 * If a different user is already responsible, returns Err(InvalidAssignment).
 */
export const canAssignResponsible: (
  params: CanAssignResponsibleParams,
) => Result<void, DomainError> = ({ currentResponsibleUserId, newUserId }) => {
  if (currentResponsibleUserId !== null && currentResponsibleUserId !== newUserId) {
    return err(
      invalidAssignment(
        'Task already has a responsible user assigned. Unassign the current user first.',
      ),
    )
  }
  return ok(undefined)
}
