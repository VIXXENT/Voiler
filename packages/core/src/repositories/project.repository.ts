import type { ResultAsync } from 'neverthrow'

import type { AppError } from '../errors/app-error'

/**
 * Flat record returned by the project persistence adapter.
 * Contains all persisted columns including computed/lifecycle fields.
 */
export interface ProjectRecord {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly ownerId: string
  readonly status: 'active' | 'archived'
  readonly frozen: boolean
  readonly unfrozenAt: Date | null
  readonly cooldownMinutes: number | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Data required to create a new project.
 */
export interface CreateProjectData {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly ownerId: string
}

/**
 * Partial data allowed when updating an existing project.
 * `updatedAt` is always required so the adapter stamps the record correctly.
 */
export interface UpdateProjectData {
  readonly name?: string
  readonly description?: string
  readonly status?: 'active' | 'archived'
  readonly frozen?: boolean
  readonly unfrozenAt?: Date | null
  readonly cooldownMinutes?: number | null
  readonly updatedAt: Date
}

/**
 * Port interface for project persistence.
 *
 * Adapters (e.g. Drizzle) implement this contract.
 * The core layer never imports concrete implementations.
 */
export interface IProjectRepository {
  /** Persist a new project. */
  create: (params: { data: CreateProjectData }) => ResultAsync<ProjectRecord, AppError>
  /** Find a project by ID. Returns null if not found. */
  findById: (params: { id: string }) => ResultAsync<ProjectRecord | null, AppError>
  /** Find all projects owned by a user. */
  findByOwner: (params: { ownerId: string }) => ResultAsync<ProjectRecord[], AppError>
  /** Update a project record. */
  update: (params: { id: string; data: UpdateProjectData }) => ResultAsync<ProjectRecord, AppError>
  /** Delete a project by ID. */
  delete: (params: { id: string }) => ResultAsync<void, AppError>
  /** Count projects owned by a user. */
  countByOwner: (params: { ownerId: string }) => ResultAsync<number, AppError>
  /** Delete a project and all its tasks + assignees atomically (cascade). */
  deleteWithCascade: (params: { id: string }) => ResultAsync<void, AppError>
}
