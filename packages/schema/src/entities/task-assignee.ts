import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { Task } from './task.js'

/**
 * TaskAssignee table definition for PostgreSQL via Drizzle ORM.
 * Represents the assignment of a user to a task with a specific role.
 *
 * @remarks
 * taskId references Task with cascade delete.
 * userId references a user id (no FK constraint yet).
 * Unique constraint on (taskId, userId) prevents duplicate assignments.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const TaskAssignee = pgTable(
  'task_assignee',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => Task.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    role: text('role').notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull(),
  },
  (table) => [unique().on(table.taskId, table.userId)],
)

/**
 * Zod schema for selecting a TaskAssignee from the database.
 * Inferred from the Drizzle table definition — stays in sync automatically.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const TaskAssigneeSelectSchema = createSelectSchema(TaskAssignee)

/**
 * Zod schema for inserting a new TaskAssignee into the database.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const TaskAssigneeInsertSchema = createInsertSchema(TaskAssignee, {
  role: z.enum(['responsible', 'reviewer', 'collaborator']),
})

/**
 * TypeScript type for a TaskAssignee record as selected from the database.
 * Narrows role to union literal values.
 */
type TaskAssigneeRecord = Omit<z.infer<typeof TaskAssigneeSelectSchema>, 'role'> & {
  role: 'responsible' | 'reviewer' | 'collaborator'
}

/**
 * TypeScript type for inserting a new TaskAssignee record.
 */
type TaskAssigneeInsert = z.infer<typeof TaskAssigneeInsertSchema>

export { TaskAssignee, TaskAssigneeSelectSchema, TaskAssigneeInsertSchema }
export type { TaskAssigneeRecord, TaskAssigneeInsert }
