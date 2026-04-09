import type { IProjectRepository, ProjectRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { count, eq, inArray } from 'drizzle-orm'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'

import type { DbClient } from '../../db/index.js'
import { Project, Task, TaskAssignee } from '../../db/schema.js'

type ProjectRow = typeof Project.$inferSelect

interface CreateDrizzleProjectRepositoryParams {
  db: DbClient
}

const mapRowToRecord: (params: { row: ProjectRow }) => ProjectRecord = (params) => {
  const { row } = params
  const status = row.status === 'archived' ? row.status : 'active'
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.ownerId,
    status,
    frozen: row.frozen,
    unfrozenAt: row.unfrozenAt,
    cooldownMinutes: row.cooldownMinutes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Create a Drizzle-backed implementation of IProjectRepository.
 */
const createDrizzleProjectRepository: (
  params: CreateDrizzleProjectRepositoryParams,
) => IProjectRepository = (params) => {
  const { db } = params

  const create: IProjectRepository['create'] = (createParams) => {
    const { data } = createParams
    return ResultAsync.fromPromise(
      db
        .insert(Project)
        .values({
          id: data.id,
          name: data.name,
          description: data.description ?? null,
          ownerId: data.ownerId,
          status: 'active',
          frozen: false,
          unfrozenAt: null,
          cooldownMinutes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(),
      (cause) => infrastructureError({ message: 'Failed to create project', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) {
        return errAsync(infrastructureError({ message: 'Insert returned no rows' }))
      }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const findById: IProjectRepository['findById'] = (findParams) => {
    return ResultAsync.fromPromise(
      db.select().from(Project).where(eq(Project.id, findParams.id)),
      (cause) => infrastructureError({ message: 'Failed to find project by id', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) {
        return okAsync(null)
      }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const findByOwner: IProjectRepository['findByOwner'] = (findParams) => {
    return ResultAsync.fromPromise(
      db.select().from(Project).where(eq(Project.ownerId, findParams.ownerId)),
      (cause) => infrastructureError({ message: 'Failed to find projects by owner', cause }),
    ).map((rows) => rows.map((row) => mapRowToRecord({ row })))
  }

  const update: IProjectRepository['update'] = (updateParams) => {
    const { id, data } = updateParams
    const values: {
      name?: string
      description?: string | null
      ownerId?: string
      status?: string
      frozen?: boolean
      unfrozenAt?: Date | null
      cooldownMinutes?: number | null
      updatedAt: Date
    } = {
      updatedAt: data.updatedAt,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.ownerId !== undefined ? { ownerId: data.ownerId } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.frozen !== undefined ? { frozen: data.frozen } : {}),
      ...(data.unfrozenAt !== undefined ? { unfrozenAt: data.unfrozenAt } : {}),
      ...(data.cooldownMinutes !== undefined ? { cooldownMinutes: data.cooldownMinutes } : {}),
    }
    return ResultAsync.fromPromise(
      db.update(Project).set(values).where(eq(Project.id, id)).returning(),
      (cause) => infrastructureError({ message: 'Failed to update project', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) {
        return errAsync(infrastructureError({ message: 'Update returned no rows' }))
      }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const del: IProjectRepository['delete'] = (deleteParams) => {
    return ResultAsync.fromPromise(
      db.delete(Project).where(eq(Project.id, deleteParams.id)),
      (cause) => infrastructureError({ message: 'Failed to delete project', cause }),
    ).map(() => undefined)
  }

  const countByOwner: IProjectRepository['countByOwner'] = (countParams) => {
    return ResultAsync.fromPromise(
      db.select({ value: count() }).from(Project).where(eq(Project.ownerId, countParams.ownerId)),
      (cause) => infrastructureError({ message: 'Failed to count projects by owner', cause }),
    ).andThen((rows) => okAsync(rows[0]?.value ?? 0))
  }

  const deleteWithCascade: IProjectRepository['deleteWithCascade'] = (deleteParams) => {
    return ResultAsync.fromPromise(
      db.transaction(async (tx) => {
        const tasks = await tx
          .select({ id: Task.id })
          .from(Task)
          .where(eq(Task.projectId, deleteParams.id))
        const taskIds = tasks.map((t) => t.id)
        if (taskIds.length > 0) {
          await tx.delete(TaskAssignee).where(inArray(TaskAssignee.taskId, taskIds))
        }
        await tx.delete(Task).where(eq(Task.projectId, deleteParams.id))
        await tx.delete(Project).where(eq(Project.id, deleteParams.id))
      }),
      (cause) => infrastructureError({ message: 'Failed to delete project with cascade', cause }),
    ).map(() => undefined)
  }

  return {
    create,
    findById,
    findByOwner,
    update,
    delete: del,
    countByOwner,
    deleteWithCascade,
  }
}

export { createDrizzleProjectRepository }
export type { CreateDrizzleProjectRepositoryParams }
