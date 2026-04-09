import type { ResultAsync } from 'neverthrow'

import type { AppError } from '../errors/app-error'

/**
 * Flat record returned by the project member persistence adapter.
 * Contains all persisted columns including lifecycle fields.
 */
export interface ProjectMemberRecord {
  readonly id: string
  readonly projectId: string
  readonly userId: string
  readonly role: 'member' | 'viewer'
  readonly joinedAt: Date
}

/**
 * Data required to create a new project member record.
 */
export interface CreateMemberData {
  readonly id: string
  readonly projectId: string
  readonly userId: string
  readonly role: 'member' | 'viewer'
  readonly joinedAt: Date
}

/**
 * Port interface for project member persistence.
 *
 * Adapters (e.g. Drizzle) implement this contract.
 * The core layer never imports concrete implementations.
 */
export interface IProjectMemberRepository {
  /** Add a user as a member of a project. */
  addMember: (params: { data: CreateMemberData }) => ResultAsync<ProjectMemberRecord, AppError>
  /** Remove a user's membership from a project. */
  removeMember: (params: { projectId: string; userId: string }) => ResultAsync<void, AppError>
  /** List all members of a project. */
  findByProject: (params: { projectId: string }) => ResultAsync<ProjectMemberRecord[], AppError>
  /** Find a specific user's membership in a project. Returns null if not a member. */
  findMembership: (params: { projectId: string; userId: string }) => ResultAsync<ProjectMemberRecord | null, AppError>
  /** Update a member's role. */
  updateRole: (params: { projectId: string; userId: string; role: 'member' | 'viewer' }) => ResultAsync<ProjectMemberRecord, AppError>
  /** Delete all memberships for a project (used in cascade delete). */
  deleteByProject: (params: { projectId: string }) => ResultAsync<void, AppError>
  /** Delete all memberships for a user (used when deleting a user account). */
  deleteByUser: (params: { userId: string }) => ResultAsync<void, AppError>
}
