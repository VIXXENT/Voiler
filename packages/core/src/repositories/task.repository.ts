import type { ResultAsync } from 'neverthrow'

import type { AppError } from '../errors/app-error'

/**
 * Task status values.
 */
export type TaskStatus = 'todo' | 'in_progress' | 'done'

/**
 * Task priority values.
 */
export type TaskPriority = 'low' | 'medium' | 'high'

/**
 * A task record as returned from the database adapter.
 *
 * Uses union literal types so no `as` casts are needed
 * when mapping to domain/public types.
 */
export interface TaskRecord {
  readonly id: string
  readonly title: string
  readonly description: string | null
  readonly status: TaskStatus
  readonly priority: TaskPriority
  readonly projectId: string
  readonly createdBy: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Data required to create a new task.
 */
export interface CreateTaskData {
  readonly title: string
  readonly description?: string
  readonly priority?: TaskPriority
  readonly projectId: string
  readonly createdBy: string
}

/**
 * Data allowed when updating an existing task.
 */
export interface UpdateTaskData {
  readonly title?: string
  readonly description?: string
  readonly priority?: TaskPriority
}

/**
 * Filters for listing tasks within a project.
 */
export interface ListTasksFilters {
  readonly status?: TaskStatus
  readonly priority?: TaskPriority
  readonly assignedTo?: string
}

/**
 * A task assignee record.
 */
export interface TaskAssigneeRecord {
  readonly id: string
  readonly taskId: string
  readonly userId: string
  readonly assignedAt: Date
}

/**
 * Port interface for task persistence.
 *
 * Adapters (e.g. Drizzle) implement this contract.
 * The core layer never imports concrete implementations.
 */
export interface ITaskRepository {
  /** Persist a new task record. */
  create: (params: { data: CreateTaskData }) => ResultAsync<TaskRecord, AppError>

  /** Find a task by its unique identifier. */
  findById: (params: { id: string }) => ResultAsync<TaskRecord | null, AppError>

  /** Retrieve all tasks for a project with optional filters. */
  findByProject: (params: {
    projectId: string
    filters?: ListTasksFilters
  }) => ResultAsync<TaskRecord[], AppError>

  /** Update an existing task record. */
  update: (params: { id: string; data: UpdateTaskData }) => ResultAsync<TaskRecord, AppError>

  /** Update the status of a task. */
  updateStatus: (params: { id: string; status: TaskStatus }) => ResultAsync<TaskRecord, AppError>

  /** Delete a task and its assignees. */
  delete: (params: { id: string }) => ResultAsync<boolean, AppError>

  /** Count tasks in a project. */
  countByProject: (params: { projectId: string }) => ResultAsync<number, AppError>

  /** Assign a user to a task. */
  assignUser: (params: {
    taskId: string
    userId: string
  }) => ResultAsync<TaskAssigneeRecord, AppError>

  /** Remove a user from a task. */
  unassignUser: (params: { taskId: string; userId: string }) => ResultAsync<boolean, AppError>

  /** Find all assignees for a task. */
  findAssignees: (params: { taskId: string }) => ResultAsync<TaskAssigneeRecord[], AppError>
}
