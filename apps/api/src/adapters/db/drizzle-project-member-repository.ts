import type { IProjectMemberRepository, ProjectMemberRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { and, eq } from 'drizzle-orm'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'

import type { DbClient } from '../../db/index.js'
import { ProjectMember } from '../../db/schema.js'

type ProjectMemberRow = typeof ProjectMember.$inferSelect

interface CreateDrizzleProjectMemberRepositoryParams {
  db: DbClient
}

const mapRowToRecord: (params: { row: ProjectMemberRow }) => ProjectMemberRecord = (params) => {
  const { row } = params
  const role = row.role === 'viewer' ? row.role : 'member'
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    role,
    joinedAt: row.joinedAt,
  }
}

/**
 * Create a Drizzle-backed implementation of IProjectMemberRepository.
 */
const createDrizzleProjectMemberRepository: (
  params: CreateDrizzleProjectMemberRepositoryParams,
) => IProjectMemberRepository = (params) => {
  const { db } = params

  const addMember: IProjectMemberRepository['addMember'] = (addParams) => {
    const { data } = addParams
    return ResultAsync.fromPromise(
      db
        .insert(ProjectMember)
        .values({
          id: data.id,
          projectId: data.projectId,
          userId: data.userId,
          role: data.role,
          joinedAt: data.joinedAt,
        })
        .returning(),
      (cause) => infrastructureError({ message: 'Failed to add project member', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) {
        return errAsync(infrastructureError({ message: 'Insert returned no rows' }))
      }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const removeMember: IProjectMemberRepository['removeMember'] = (removeParams) => {
    return ResultAsync.fromPromise(
      db
        .delete(ProjectMember)
        .where(
          and(
            eq(ProjectMember.projectId, removeParams.projectId),
            eq(ProjectMember.userId, removeParams.userId),
          ),
        ),
      (cause) => infrastructureError({ message: 'Failed to remove project member', cause }),
    ).map(() => undefined)
  }

  const findByProject: IProjectMemberRepository['findByProject'] = (findParams) => {
    return ResultAsync.fromPromise(
      db.select().from(ProjectMember).where(eq(ProjectMember.projectId, findParams.projectId)),
      (cause) => infrastructureError({ message: 'Failed to find members by project', cause }),
    ).map((rows) => rows.map((row) => mapRowToRecord({ row })))
  }

  const findMembership: IProjectMemberRepository['findMembership'] = (findParams) => {
    return ResultAsync.fromPromise(
      db
        .select()
        .from(ProjectMember)
        .where(
          and(
            eq(ProjectMember.projectId, findParams.projectId),
            eq(ProjectMember.userId, findParams.userId),
          ),
        ),
      (cause) => infrastructureError({ message: 'Failed to find membership', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) {
        return okAsync(null)
      }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const updateRole: IProjectMemberRepository['updateRole'] = (updateParams) => {
    return ResultAsync.fromPromise(
      db
        .update(ProjectMember)
        .set({ role: updateParams.role })
        .where(
          and(
            eq(ProjectMember.projectId, updateParams.projectId),
            eq(ProjectMember.userId, updateParams.userId),
          ),
        )
        .returning(),
      (cause) => infrastructureError({ message: 'Failed to update member role', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) {
        return errAsync(infrastructureError({ message: 'Update returned no rows' }))
      }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const deleteByProject: IProjectMemberRepository['deleteByProject'] = (deleteParams) => {
    return ResultAsync.fromPromise(
      db.delete(ProjectMember).where(eq(ProjectMember.projectId, deleteParams.projectId)),
      (cause) => infrastructureError({ message: 'Failed to delete members by project', cause }),
    ).map(() => undefined)
  }

  const deleteByUser: IProjectMemberRepository['deleteByUser'] = (deleteParams) => {
    return ResultAsync.fromPromise(
      db.delete(ProjectMember).where(eq(ProjectMember.userId, deleteParams.userId)),
      (cause) => infrastructureError({ message: 'Failed to delete memberships by user', cause }),
    ).map(() => undefined)
  }

  return {
    addMember,
    removeMember,
    findByProject,
    findMembership,
    updateRole,
    deleteByProject,
    deleteByUser,
  }
}

export { createDrizzleProjectMemberRepository }
export type { CreateDrizzleProjectMemberRepositoryParams }
