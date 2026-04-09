import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { Project } from './project'

/**
 * Task table definition for PostgreSQL via Drizzle ORM.
 *
 * @remarks
 * `projectId` references the project table with cascade delete.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const Task = pgTable('task', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('todo'),
  priority: text('priority').notNull().default('medium'),
  projectId: text('project_id')
    .notNull()
    .references(() => Project.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

/**
 * Zod schema for selecting a Task from the database.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const TaskSelectSchema = createSelectSchema(Task)

/**
 * Zod schema for inserting a new Task into the database.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const TaskInsertSchema = createInsertSchema(Task, {
  title: z.string().min(1, 'Title is required').max(200),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
})

/**
 * TypeScript type for a Task record as selected from the database.
 */
type TaskSelect = z.infer<typeof TaskSelectSchema>

/**
 * TypeScript type for inserting a new Task record.
 */
type TaskInsert = z.infer<typeof TaskInsertSchema>

export { Task, TaskSelectSchema, TaskInsertSchema }
export type { TaskSelect, TaskInsert }
