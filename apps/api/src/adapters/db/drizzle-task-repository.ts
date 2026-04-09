import type { ITaskRepository, TaskRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { and, count, eq, inArray } from 'drizzle-orm'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'

import type { DbClient } from '../../db/index.js'
import { Task, TaskAssignee } from '../../db/schema.js'

type TaskRow = typeof Task.$inferSelect

interface CreateDrizzleTaskRepositoryParams {
  db: DbClient
}

const mapRowToRecord: (params: { row: TaskRow }) => TaskRecord = (params) => {
  const { row } = params
  const status =
    row.status === 'in_progress' ? row.status : row.status === 'done' ? row.status : 'todo'
  const priority =
    row.priority === 'low' ? row.priority : row.priority === 'high' ? row.priority : 'medium'
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status,
    priority,
    dueDate: row.dueDate,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Create a Drizzle-backed implementation of ITaskRepository.
 */
const createDrizzleTaskRepository: (
  params: CreateDrizzleTaskRepositoryParams,
) => ITaskRepository = (params) => {
  const { db } = params

  const create: ITaskRepository['create'] = (createParams) => {
    const { data } = createParams
    return ResultAsync.fromPromise(
      db
        .insert(Task)
        .values({
          id: data.id,
          projectId: data.projectId,
          title: data.title,
          description: data.description ?? null,
          status: 'todo',
          priority: data.priority ?? 'medium',
          dueDate: data.dueDate ?? null,
          createdBy: data.createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(),
      (cause) => infrastructureError({ message: 'Failed to create task', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) {
        return errAsync(infrastructureError({ message: 'Insert returned no rows' }))
      }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const findById: ITaskRepository['findById'] = (findParams) => {
    return ResultAsync.fromPromise(
      db.select().from(Task).where(eq(Task.id, findParams.id)),
      (cause) => infrastructureError({ message: 'Failed to find task by id', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) {
        return okAsync(null)
      }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const findByProject: ITaskRepository['findByProject'] = (findParams) => {
    const { projectId, filters } = findParams
    const conditions = [eq(Task.projectId, projectId)]

    if (filters?.status) {
      conditions.push(eq(Task.status, filters.status))
    }
    if (filters?.priority) {
      conditions.push(eq(Task.priority, filters.priority))
    }

    return ResultAsync.fromPromise(
      (async () => {
        if (filters?.assigneeId) {
          const assigneeRows = await db
            .select({ taskId: TaskAssignee.taskId })
            .from(TaskAssignee)
            .where(eq(TaskAssignee.userId, filters.assigneeId))
          const taskIds = assigneeRows.map((r) => r.taskId)
          if (taskIds.length === 0) {
            return []
          }
          conditions.push(inArray(Task.id, taskIds))
        }
        return db
          .select()
          .from(Task)
          .where(and(...conditions))
      })(),
      (cause) => infrastructureError({ message: 'Failed to find tasks by project', cause }),
    ).map((rows) => rows.map((row) => mapRowToRecord({ row })))
  }

  const update: ITaskRepository['update'] = (updateParams) => {
    const { id, data } = updateParams
    const values: {
      title?: string
      description?: string | null
      status?: string
      priority?: string
      dueDate?: Date | null
      updatedAt: Date
    } = {
      updatedAt: data.updatedAt,
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate } : {}),
    }
    return ResultAsync.fromPromise(
      db.update(Task).set(values).where(eq(Task.id, id)).returning(),
      (cause) => infrastructureError({ message: 'Failed to update task', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) {
        return errAsync(infrastructureError({ message: 'Update returned no rows' }))
      }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const del: ITaskRepository['delete'] = (deleteParams) => {
    return ResultAsync.fromPromise(db.delete(Task).where(eq(Task.id, deleteParams.id)), (cause) =>
      infrastructureError({ message: 'Failed to delete task', cause }),
    ).map(() => undefined)
  }

  const countByProject: ITaskRepository['countByProject'] = (countParams) => {
    return ResultAsync.fromPromise(
      db.select({ value: count() }).from(Task).where(eq(Task.projectId, countParams.projectId)),
      (cause) => infrastructureError({ message: 'Failed to count tasks by project', cause }),
    ).andThen((rows) => okAsync(rows[0]?.value ?? 0))
  }

  return {
    create,
    findById,
    findByProject,
    update,
    delete: del,
    countByProject,
  }
}

export { createDrizzleTaskRepository }
export type { CreateDrizzleTaskRepositoryParams }
