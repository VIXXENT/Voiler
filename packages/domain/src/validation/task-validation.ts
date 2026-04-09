import { ok, err, type Result } from 'neverthrow'

import type { DomainError } from '../errors/domain-error'
import { invalidTaskTitle, invalidStatusTransition } from '../errors/project-errors'

/** Allowed states for a task. */
export type TaskStatus = 'todo' | 'in_progress' | 'done'

/** Parameters for validateTaskTitle. */
interface ValidateTaskTitleParams {
  readonly title: string
}

/** Parameters for canTransitionStatus. */
interface CanTransitionStatusParams {
  readonly from: TaskStatus
  readonly to: TaskStatus
}

const VALID_TRANSITIONS: ReadonlyMap<TaskStatus, ReadonlySet<TaskStatus>> = new Map([
  ['todo', new Set<TaskStatus>(['in_progress'])],
  ['in_progress', new Set<TaskStatus>(['done', 'todo'])],
  ['done', new Set<TaskStatus>(['in_progress'])],
])

/**
 * Validate a task title.
 *
 * Trims the input, rejects empty strings, and enforces a 200-character maximum.
 */
export const validateTaskTitle: (
  params: ValidateTaskTitleParams,
) => Result<string, DomainError> = ({ title }) => {
  const trimmed = title.trim()
  if (trimmed.length === 0) {
    return err(invalidTaskTitle('Task title must not be empty'))
  }
  if (trimmed.length > 200) {
    return err(invalidTaskTitle('Task title must not exceed 200 characters'))
  }
  return ok(trimmed)
}

/**
 * Validate a task status transition.
 *
 * Valid transitions: todo→in_progress, in_progress→done, done→in_progress, in_progress→todo.
 * Returns ok(to) on success, Err(InvalidStatusTransition) for invalid transitions.
 */
export const canTransitionStatus: (
  params: CanTransitionStatusParams,
) => Result<TaskStatus, DomainError> = ({ from, to }) => {
  const allowed = VALID_TRANSITIONS.get(from)
  if (!allowed?.has(to)) {
    return err(invalidStatusTransition(`Cannot transition task status from '${from}' to '${to}'`))
  }
  return ok(to)
}
