import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { Task } from './task'
import { User } from './user'

/**
 * TaskAssignee join table — maps tasks to assigned users.
 *
 * @remarks
 * `taskId` references the task table with cascade delete.
 * `userId` references the user table with cascade delete.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const TaskAssignee = pgTable('task_assignee', {
  id: text('id').primaryKey(),
  taskId: text('task_id')
    .notNull()
    .references(() => Task.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => User.id, { onDelete: 'cascade' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull(),
})

/**
 * Zod schema for selecting a TaskAssignee from the database.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const TaskAssigneeSelectSchema = createSelectSchema(TaskAssignee)

/**
 * Zod schema for inserting a new TaskAssignee record.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const TaskAssigneeInsertSchema = createInsertSchema(TaskAssignee, {
  taskId: z.string().min(1),
  userId: z.string().min(1),
})

/**
 * TypeScript type for a TaskAssignee record as selected from the database.
 */
type TaskAssigneeSelect = z.infer<typeof TaskAssigneeSelectSchema>

/**
 * TypeScript type for inserting a new TaskAssignee record.
 */
type TaskAssigneeInsert = z.infer<typeof TaskAssigneeInsertSchema>

export { TaskAssignee, TaskAssigneeSelectSchema, TaskAssigneeInsertSchema }
export type { TaskAssigneeSelect, TaskAssigneeInsert }
