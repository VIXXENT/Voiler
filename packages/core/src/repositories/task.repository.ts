import type { ResultAsync } from 'neverthrow'

import type { AppError } from '../errors/app-error'

/**
 * Flat record returned by the task persistence adapter.
 * Contains all persisted columns including computed/lifecycle fields.
 */
export interface TaskRecord {
  readonly id: string
  readonly projectId: string
  readonly title: string
  readonly description: string | null
  readonly status: 'todo' | 'in_progress' | 'done'
  readonly priority: 'low' | 'medium' | 'high'
  readonly dueDate: Date | null
  readonly createdBy: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Data required to create a new task.
 */
export interface CreateTaskData {
  readonly id: string
  readonly projectId: string
  readonly title: string
  readonly description?: string
  readonly priority?: 'low' | 'medium' | 'high'
  readonly dueDate?: Date
  readonly createdBy: string
}

/**
 * Partial data allowed when updating an existing task.
 * `updatedAt` is always required so the adapter stamps the record correctly.
 */
export interface UpdateTaskData {
  readonly title?: string
  readonly description?: string
  readonly status?: 'todo' | 'in_progress' | 'done'
  readonly priority?: 'low' | 'medium' | 'high'
  readonly dueDate?: Date | null
  readonly updatedAt: Date
}

/**
 * Optional filters for task list queries.
 */
export interface TaskFilters {
  readonly status?: 'todo' | 'in_progress' | 'done'
  readonly assigneeId?: string
  readonly priority?: 'low' | 'medium' | 'high'
}

/**
 * Port interface for task persistence.
 *
 * Adapters (e.g. Drizzle) implement this contract.
 * The core layer never imports concrete implementations.
 */
export interface ITaskRepository {
  /** Persist a new task. */
  create: (params: { data: CreateTaskData }) => ResultAsync<TaskRecord, AppError>
  /** Find a task by ID. Returns null if not found. */
  findById: (params: { id: string }) => ResultAsync<TaskRecord | null, AppError>
  /** Find all tasks belonging to a project, with optional filters. */
  findByProject: (params: {
    projectId: string
    filters?: TaskFilters
  }) => ResultAsync<TaskRecord[], AppError>
  /** Update a task record. */
  update: (params: { id: string; data: UpdateTaskData }) => ResultAsync<TaskRecord, AppError>
  /** Delete a task by ID. */
  delete: (params: { id: string }) => ResultAsync<void, AppError>
  /** Count tasks belonging to a project. */
  countByProject: (params: { projectId: string }) => ResultAsync<number, AppError>
}
