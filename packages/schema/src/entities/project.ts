import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

/**
 * Project table definition for PostgreSQL via Drizzle ORM.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const Project = pgTable('project', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').notNull().default('active'),
  ownerId: text('owner_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

/**
 * Zod schema for selecting a Project from the database.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const ProjectSelectSchema = createSelectSchema(Project)

/**
 * Zod schema for inserting a new Project into the database.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const ProjectInsertSchema = createInsertSchema(Project, {
  name: z.string().min(1, 'Name is required').max(100),
  status: z.enum(['active', 'archived']).default('active'),
})

/**
 * TypeScript type for a Project record as selected from the database.
 */
type ProjectSelect = z.infer<typeof ProjectSelectSchema>

/**
 * TypeScript type for inserting a new Project record.
 */
type ProjectInsert = z.infer<typeof ProjectInsertSchema>

export { Project, ProjectSelectSchema, ProjectInsertSchema }
export type { ProjectSelect, ProjectInsert }
