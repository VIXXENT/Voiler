import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

/**
 * Project table definition for PostgreSQL via Drizzle ORM.
 * Represents a TaskForge project owned by a user.
 *
 * @remarks
 * ownerId references a user but no FK constraint yet — will be added
 * once user FK wiring is complete.
 * frozen/unfrozenAt/cooldownMinutes support the freeze-cooldown feature.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const Project = pgTable('project', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: text('owner_id').notNull(),
  status: text('status').notNull().default('active'),
  frozen: boolean('frozen').notNull().default(false),
  unfrozenAt: timestamp('unfrozen_at', { withTimezone: true }),
  cooldownMinutes: integer('cooldown_minutes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
})

/**
 * Zod schema for selecting a Project from the database.
 * Inferred from the Drizzle table definition — stays in sync automatically.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const ProjectSelectSchema = createSelectSchema(Project)

/**
 * Zod schema for inserting a new Project into the database.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const ProjectInsertSchema = createInsertSchema(Project, {
  name: z.string().min(1, 'Name is required').max(200),
  status: z.enum(['active', 'archived']).default('active'),
})

/**
 * TypeScript type for a Project record as selected from the database.
 * Narrows status to union literal values.
 */
type ProjectRecord = Omit<z.infer<typeof ProjectSelectSchema>, 'status'> & {
  status: 'active' | 'archived'
}

/**
 * TypeScript type for inserting a new Project record.
 */
type ProjectInsert = z.infer<typeof ProjectInsertSchema>

export { Project, ProjectSelectSchema, ProjectInsertSchema }
export type { ProjectRecord, ProjectInsert }
