import type { ResultAsync } from 'neverthrow'

import type { AppError } from '../errors/app-error'

/**
 * A project record as returned from the database adapter.
 *
 * Uses union literal types so no `as` casts are needed
 * when mapping to domain/public types.
 */
export interface ProjectRecord {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly status: 'active' | 'archived'
  readonly ownerId: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Data required to create a new project.
 */
export interface CreateProjectData {
  readonly name: string
  readonly description?: string
  readonly ownerId: string
}

/**
 * Data allowed when updating an existing project.
 */
export interface UpdateProjectData {
  readonly name?: string
  readonly description?: string
  readonly status?: 'active' | 'archived'
}

/**
 * Port interface for project persistence.
 *
 * Adapters (e.g. Drizzle) implement this contract.
 * The core layer never imports concrete implementations.
 */
export interface IProjectRepository {
  /** Persist a new project record. */
  create: (params: { data: CreateProjectData }) => ResultAsync<ProjectRecord, AppError>

  /** Find a project by its unique identifier. */
  findById: (params: { id: string }) => ResultAsync<ProjectRecord | null, AppError>

  /** Retrieve all projects owned by a user. */
  findByOwner: (params: { userId: string }) => ResultAsync<ProjectRecord[], AppError>

  /** Update an existing project record. */
  update: (params: { id: string; data: UpdateProjectData }) => ResultAsync<ProjectRecord, AppError>

  /** Delete a project by its unique identifier. */
  delete: (params: { id: string }) => ResultAsync<boolean, AppError>

  /** Count projects owned by a user. */
  countByOwner: (params: { userId: string }) => ResultAsync<number, AppError>

  /**
   * Delete a project and all its tasks and task assignees atomically.
   * Implemented with a DB transaction in the adapter.
   */
  deleteWithCascade: (params: { projectId: string }) => ResultAsync<void, AppError>
}
