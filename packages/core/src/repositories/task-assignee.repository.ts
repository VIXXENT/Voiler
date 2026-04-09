import type { ResultAsync } from 'neverthrow'

import type { AppError } from '../errors/app-error'

/**
 * Flat record returned by the task-assignee persistence adapter.
 */
export interface TaskAssigneeRecord {
  readonly id: string
  readonly taskId: string
  readonly userId: string
  readonly role: 'responsible' | 'reviewer' | 'collaborator'
  readonly assignedAt: Date
}

/**
 * Data required to assign a user to a task.
 */
export interface AssignTaskData {
  readonly id: string
  readonly taskId: string
  readonly userId: string
  readonly role: 'responsible' | 'reviewer' | 'collaborator'
  readonly assignedAt: Date
}

/**
 * Port interface for task-assignee persistence.
 *
 * Adapters (e.g. Drizzle) implement this contract.
 * The core layer never imports concrete implementations.
 */
export interface ITaskAssigneeRepository {
  /** Assign a user to a task. */
  assign: (params: { data: AssignTaskData }) => ResultAsync<TaskAssigneeRecord, AppError>
  /** Remove a user's assignment from a task. */
  unassign: (params: { taskId: string; userId: string }) => ResultAsync<void, AppError>
  /** Find all assignees for a task. */
  findByTask: (params: { taskId: string }) => ResultAsync<TaskAssigneeRecord[], AppError>
  /** Find the responsible assignee for a task. Returns null if none. */
  findResponsible: (params: { taskId: string }) => ResultAsync<TaskAssigneeRecord | null, AppError>
  /** Delete all assignees for a task (used during cascade delete). */
  deleteByTask: (params: { taskId: string }) => ResultAsync<void, AppError>
}
