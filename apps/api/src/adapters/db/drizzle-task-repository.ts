import { infrastructureError } from '@voiler/core'
import type {
  ITaskRepository,
  TaskAssigneeRecord,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from '@voiler/core'
import { and, count, eq } from 'drizzle-orm'
import { ResultAsync, errAsync } from 'neverthrow'

import type { DbClient } from '../../db/index.js'
import { Task, TaskAssignee } from '../../db/schema.js'

/**
 * Drizzle row type for the Task table.
 */
type TaskRow = typeof Task.$inferSelect

/**
 * Drizzle row type for the TaskAssignee table.
 */
type TaskAssigneeRow = typeof TaskAssignee.$inferSelect

/**
 * Parameters for creating a DrizzleTaskRepository.
 */
interface CreateDrizzleTaskRepositoryParams {
  db: DbClient
}

/**
 * Map a raw Drizzle row to a TaskRecord.
 *
 * The status and priority columns are stored as text in the DB
 * but constrained to known values by Zod on insert, so we narrow here.
 */
const mapRowToRecord: (params: { row: TaskRow }) => TaskRecord = (params) => {
  const { row } = params

  const statusMap: Record<string, TaskStatus> = {
    todo: 'todo',
    in_progress: 'in_progress',
    done: 'done',
  }
  const priorityMap: Record<string, TaskPriority> = {
    low: 'low',
    medium: 'medium',
    high: 'high',
  }

  const status: TaskStatus = statusMap[row.status] ?? 'todo'
  const priority: TaskPriority = priorityMap[row.priority] ?? 'medium'

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status,
    priority,
    projectId: row.projectId,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Map a raw Drizzle row to a TaskAssigneeRecord.
 */
const mapAssigneeRowToRecord: (params: { row: TaskAssigneeRow }) => TaskAssigneeRecord = (
  params,
) => ({
  id: params.row.id,
  taskId: params.row.taskId,
  userId: params.row.userId,
  assignedAt: params.row.assignedAt,
})

/**
 * Create a Drizzle-backed implementation of ITaskRepository.
 *
 * All queries are wrapped in ResultAsync for safe error
 * propagation through the hexagonal architecture.
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
          id: crypto.randomUUID(),
          title: data.title,
          description: data.description ?? null,
          status: 'todo',
          priority: data.priority ?? 'medium',
          projectId: data.projectId,
          createdBy: data.createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(),
      (cause) => infrastructureError({ message: 'Failed to create task', cause }),
    ).andThen((rows) => {
      const row: TaskRow | undefined = rows[0]

      if (!row) {
        return errAsync(infrastructureError({ message: 'Insert returned no rows' }))
      }

      return ResultAsync.fromSafePromise(Promise.resolve(mapRowToRecord({ row })))
    })
  }

  const findById: ITaskRepository['findById'] = (findParams) => {
    return ResultAsync.fromPromise(
      db.select().from(Task).where(eq(Task.id, findParams.id)),
      (cause) => infrastructureError({ message: 'Failed to find task by id', cause }),
    ).map((rows) => {
      const row: TaskRow | undefined = rows[0]

      return row ? mapRowToRecord({ row }) : null
    })
  }

  const findByProject: ITaskRepository['findByProject'] = (findParams) => {
    const conditions = [eq(Task.projectId, findParams.projectId)]

    if (findParams.filters?.status) {
      conditions.push(eq(Task.status, findParams.filters.status))
    }

    if (findParams.filters?.priority) {
      conditions.push(eq(Task.priority, findParams.filters.priority))
    }

    return ResultAsync.fromPromise(
      db
        .select()
        .from(Task)
        .where(and(...conditions)),
      (cause) => infrastructureError({ message: 'Failed to find tasks by project', cause }),
    ).map((rows) => rows.map((row) => mapRowToRecord({ row })))
  }

  const update: ITaskRepository['update'] = (updateParams) => {
    const values: {
      title?: string
      description?: string | null
      priority?: string
      updatedAt: Date
    } = { updatedAt: new Date() }

    if (updateParams.data.title !== undefined) {
      values.title = updateParams.data.title
    }

    if (updateParams.data.description !== undefined) {
      values.description = updateParams.data.description
    }

    if (updateParams.data.priority !== undefined) {
      values.priority = updateParams.data.priority
    }

    return ResultAsync.fromPromise(
      db.update(Task).set(values).where(eq(Task.id, updateParams.id)).returning(),
      (cause) => infrastructureError({ message: 'Failed to update task', cause }),
    ).andThen((rows) => {
      const row: TaskRow | undefined = rows[0]

      if (!row) {
        return errAsync(infrastructureError({ message: 'Update returned no rows' }))
      }

      return ResultAsync.fromSafePromise(Promise.resolve(mapRowToRecord({ row })))
    })
  }

  const updateStatus: ITaskRepository['updateStatus'] = (statusParams) => {
    return ResultAsync.fromPromise(
      db
        .update(Task)
        .set({ status: statusParams.status, updatedAt: new Date() })
        .where(eq(Task.id, statusParams.id))
        .returning(),
      (cause) => infrastructureError({ message: 'Failed to update task status', cause }),
    ).andThen((rows) => {
      const row: TaskRow | undefined = rows[0]

      if (!row) {
        return errAsync(infrastructureError({ message: 'Status update returned no rows' }))
      }

      return ResultAsync.fromSafePromise(Promise.resolve(mapRowToRecord({ row })))
    })
  }

  const del: ITaskRepository['delete'] = (deleteParams) => {
    return ResultAsync.fromPromise(
      db.transaction(async (tx) => {
        await tx.delete(TaskAssignee).where(eq(TaskAssignee.taskId, deleteParams.id))
        const deleted: { id: string }[] = await tx
          .delete(Task)
          .where(eq(Task.id, deleteParams.id))
          .returning({ id: Task.id })

        return deleted.length > 0
      }),
      (cause) => infrastructureError({ message: 'Failed to delete task', cause }),
    )
  }

  const countByProject: ITaskRepository['countByProject'] = (countParams) => {
    return ResultAsync.fromPromise(
      db.select({ value: count() }).from(Task).where(eq(Task.projectId, countParams.projectId)),
      (cause) => infrastructureError({ message: 'Failed to count tasks', cause }),
    ).map((rows) => rows[0]?.value ?? 0)
  }

  const assignUser: ITaskRepository['assignUser'] = (assignParams) => {
    return ResultAsync.fromPromise(
      db
        .insert(TaskAssignee)
        .values({
          id: crypto.randomUUID(),
          taskId: assignParams.taskId,
          userId: assignParams.userId,
          assignedAt: new Date(),
        })
        .returning(),
      (cause) => infrastructureError({ message: 'Failed to assign user to task', cause }),
    ).andThen((rows) => {
      const row: TaskAssigneeRow | undefined = rows[0]

      if (!row) {
        return errAsync(infrastructureError({ message: 'Assignee insert returned no rows' }))
      }

      return ResultAsync.fromSafePromise(Promise.resolve(mapAssigneeRowToRecord({ row })))
    })
  }

  const unassignUser: ITaskRepository['unassignUser'] = (unassignParams) => {
    return ResultAsync.fromPromise(
      db
        .delete(TaskAssignee)
        .where(
          and(
            eq(TaskAssignee.taskId, unassignParams.taskId),
            eq(TaskAssignee.userId, unassignParams.userId),
          ),
        )
        .returning()
        .then((rows) => rows.length > 0),
      (cause) => infrastructureError({ message: 'Failed to unassign user from task', cause }),
    )
  }

  const findAssignees: ITaskRepository['findAssignees'] = (findParams) => {
    return ResultAsync.fromPromise(
      db.select().from(TaskAssignee).where(eq(TaskAssignee.taskId, findParams.taskId)),
      (cause) => infrastructureError({ message: 'Failed to find task assignees', cause }),
    ).map((rows) => rows.map((row) => mapAssigneeRowToRecord({ row })))
  }

  return {
    create,
    findById,
    findByProject,
    update,
    updateStatus,
    delete: del,
    countByProject,
    assignUser,
    unassignUser,
    findAssignees,
  }
}

export { createDrizzleTaskRepository }
export type { CreateDrizzleTaskRepositoryParams }
