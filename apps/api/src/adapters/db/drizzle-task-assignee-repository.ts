import type { ITaskAssigneeRepository, TaskAssigneeRecord } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import { and, eq } from 'drizzle-orm'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'

import type { DbClient } from '../../db/index.js'
import { TaskAssignee } from '../../db/schema.js'

type TaskAssigneeRow = typeof TaskAssignee.$inferSelect

interface CreateDrizzleTaskAssigneeRepositoryParams {
  db: DbClient
}

const mapRowToRecord: (params: { row: TaskAssigneeRow }) => TaskAssigneeRecord = (params) => {
  const { row } = params
  const role =
    row.role === 'responsible'
      ? row.role
      : row.role === 'reviewer'
        ? row.role
        : 'collaborator'
  return {
    id: row.id,
    taskId: row.taskId,
    userId: row.userId,
    role,
    assignedAt: row.assignedAt,
  }
}

/**
 * Create a Drizzle-backed implementation of ITaskAssigneeRepository.
 */
const createDrizzleTaskAssigneeRepository: (
  params: CreateDrizzleTaskAssigneeRepositoryParams,
) => ITaskAssigneeRepository = (params) => {
  const { db } = params

  const assign: ITaskAssigneeRepository['assign'] = (assignParams) => {
    const { data } = assignParams
    return ResultAsync.fromPromise(
      db
        .insert(TaskAssignee)
        .values({
          id: data.id,
          taskId: data.taskId,
          userId: data.userId,
          role: data.role,
          assignedAt: data.assignedAt,
        })
        .returning(),
      (cause) => infrastructureError({ message: 'Failed to assign user to task', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) { return errAsync(infrastructureError({ message: 'Insert returned no rows' })) }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const unassign: ITaskAssigneeRepository['unassign'] = (unassignParams) => {
    return ResultAsync.fromPromise(
      db
        .delete(TaskAssignee)
        .where(
          and(
            eq(TaskAssignee.taskId, unassignParams.taskId),
            eq(TaskAssignee.userId, unassignParams.userId),
          ),
        ),
      (cause) => infrastructureError({ message: 'Failed to unassign user from task', cause }),
    ).map(() => undefined)
  }

  const findByTask: ITaskAssigneeRepository['findByTask'] = (findParams) => {
    return ResultAsync.fromPromise(
      db.select().from(TaskAssignee).where(eq(TaskAssignee.taskId, findParams.taskId)),
      (cause) => infrastructureError({ message: 'Failed to find assignees by task', cause }),
    ).map((rows) => rows.map((row) => mapRowToRecord({ row })))
  }

  const findResponsible: ITaskAssigneeRepository['findResponsible'] = (findParams) => {
    return ResultAsync.fromPromise(
      db
        .select()
        .from(TaskAssignee)
        .where(
          and(
            eq(TaskAssignee.taskId, findParams.taskId),
            eq(TaskAssignee.role, 'responsible'),
          ),
        ),
      (cause) => infrastructureError({ message: 'Failed to find responsible assignee', cause }),
    ).andThen((rows) => {
      const row = rows[0]
      if (!row) { return okAsync(null) }
      return okAsync(mapRowToRecord({ row }))
    })
  }

  const deleteByTask: ITaskAssigneeRepository['deleteByTask'] = (deleteParams) => {
    return ResultAsync.fromPromise(
      db.delete(TaskAssignee).where(eq(TaskAssignee.taskId, deleteParams.taskId)),
      (cause) => infrastructureError({ message: 'Failed to delete assignees by task', cause }),
    ).map(() => undefined)
  }

  return {
    assign,
    unassign,
    findByTask,
    findResponsible,
    deleteByTask,
  }
}

export { createDrizzleTaskAssigneeRepository }
export type { CreateDrizzleTaskAssigneeRepositoryParams }
