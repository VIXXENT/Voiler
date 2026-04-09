import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { Project } from './project.js'

/**
 * Task table definition for PostgreSQL via Drizzle ORM.
 * Represents a task within a TaskForge project.
 *
 * @remarks
 * projectId references Project with cascade delete.
 * createdBy references a user id (no FK constraint yet).
 */
// eslint-disable-next-line @typescript-eslint/typedef
const Task = pgTable('task', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => Project.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('todo'),
  priority: text('priority').notNull().default('medium'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

/**
 * Zod schema for selecting a Task from the database.
 * Inferred from the Drizzle table definition — stays in sync automatically.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const TaskSelectSchema = createSelectSchema(Task)

/**
 * Zod schema for inserting a new Task into the database.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const TaskInsertSchema = createInsertSchema(Task, {
  title: z.string().min(1, 'Title is required').max(500),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
})

/**
 * TypeScript type for a Task record as selected from the database.
 * Narrows status and priority to union literal values.
 */
type TaskRecord = Omit<z.infer<typeof TaskSelectSchema>, 'status' | 'priority'> & {
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
}

/**
 * TypeScript type for inserting a new Task record.
 */
type TaskInsert = z.infer<typeof TaskInsertSchema>

export { Task, TaskSelectSchema, TaskInsertSchema }
export type { TaskRecord, TaskInsert }
