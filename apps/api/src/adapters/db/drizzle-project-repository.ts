import { infrastructureError } from '@voiler/core'
import type { IProjectRepository, ProjectRecord } from '@voiler/core'
import { count, eq } from 'drizzle-orm'
import { ResultAsync, errAsync } from 'neverthrow'

import type { DbClient } from '../../db/index.js'
import { Project, Task, TaskAssignee } from '../../db/schema.js'

/**
 * Drizzle row type for the Project table.
 */
type ProjectRow = typeof Project.$inferSelect

/**
 * Parameters for creating a DrizzleProjectRepository.
 */
interface CreateDrizzleProjectRepositoryParams {
  db: DbClient
}

/**
 * Map a raw Drizzle row to a ProjectRecord.
 *
 * The status column is stored as text in the DB but constrained
 * to known values by Zod on insert, so we narrow safely here.
 */
const mapRowToRecord: (params: { row: ProjectRow }) => ProjectRecord = (params) => {
  const { row } = params

  const status: 'active' | 'archived' = row.status === 'archived' ? 'archived' : 'active'

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status,
    ownerId: row.ownerId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Create a Drizzle-backed implementation of IProjectRepository.
 *
 * All queries are wrapped in ResultAsync for safe error
 * propagation through the hexagonal architecture.
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
          id: crypto.randomUUID(),
          name: data.name,
          description: data.description ?? null,
          status: 'active',
          ownerId: data.ownerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(),
      (cause) => infrastructureError({ message: 'Failed to create project', cause }),
    ).andThen((rows) => {
      const row: ProjectRow | undefined = rows[0]

      if (!row) {
        return errAsync(infrastructureError({ message: 'Insert returned no rows' }))
      }

      return ResultAsync.fromSafePromise(Promise.resolve(mapRowToRecord({ row })))
    })
  }

  const findById: IProjectRepository['findById'] = (findParams) => {
    return ResultAsync.fromPromise(
      db.select().from(Project).where(eq(Project.id, findParams.id)),
      (cause) => infrastructureError({ message: 'Failed to find project by id', cause }),
    ).map((rows) => {
      const row: ProjectRow | undefined = rows[0]

      return row ? mapRowToRecord({ row }) : null
    })
  }

  const findByOwner: IProjectRepository['findByOwner'] = (findParams) => {
    return ResultAsync.fromPromise(
      db.select().from(Project).where(eq(Project.ownerId, findParams.userId)),
      (cause) => infrastructureError({ message: 'Failed to find projects by owner', cause }),
    ).map((rows) => rows.map((row) => mapRowToRecord({ row })))
  }

  const update: IProjectRepository['update'] = (updateParams) => {
    const values: {
      name?: string
      description?: string | null
      status?: string
      updatedAt: Date
    } = { updatedAt: new Date() }

    if (updateParams.data.name !== undefined) {
      values.name = updateParams.data.name
    }

    if (updateParams.data.description !== undefined) {
      values.description = updateParams.data.description
    }

    if (updateParams.data.status !== undefined) {
      values.status = updateParams.data.status
    }

    return ResultAsync.fromPromise(
      db.update(Project).set(values).where(eq(Project.id, updateParams.id)).returning(),
      (cause) => infrastructureError({ message: 'Failed to update project', cause }),
    ).andThen((rows) => {
      const row: ProjectRow | undefined = rows[0]

      if (!row) {
        return errAsync(infrastructureError({ message: 'Update returned no rows' }))
      }

      return ResultAsync.fromSafePromise(Promise.resolve(mapRowToRecord({ row })))
    })
  }

  const del: IProjectRepository['delete'] = (deleteParams) => {
    return ResultAsync.fromPromise(
      db
        .delete(Project)
        .where(eq(Project.id, deleteParams.id))
        .returning()
        .then((rows) => rows.length > 0),
      (cause) => infrastructureError({ message: 'Failed to delete project', cause }),
    )
  }

  const countByOwner: IProjectRepository['countByOwner'] = (countParams) => {
    return ResultAsync.fromPromise(
      db.select({ value: count() }).from(Project).where(eq(Project.ownerId, countParams.userId)),
      (cause) => infrastructureError({ message: 'Failed to count projects', cause }),
    ).map((rows) => rows[0]?.value ?? 0)
  }

  const deleteWithCascade: IProjectRepository['deleteWithCascade'] = (cascadeParams) => {
    return ResultAsync.fromPromise(
      db.transaction(async (tx) => {
        // Get all tasks for the project
        const tasks: { id: string }[] = await tx
          .select({ id: Task.id })
          .from(Task)
          .where(eq(Task.projectId, cascadeParams.projectId))

        // Delete assignees for all tasks
        for (const task of tasks) {
          await tx.delete(TaskAssignee).where(eq(TaskAssignee.taskId, task.id))
        }

        // Delete all tasks
        await tx.delete(Task).where(eq(Task.projectId, cascadeParams.projectId))

        // Delete the project
        await tx.delete(Project).where(eq(Project.id, cascadeParams.projectId))
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
