import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import { Project } from './project.js'

/**
 * ProjectMember table definition for PostgreSQL via Drizzle ORM.
 * Represents a user's membership in a project with a specific role.
 *
 * @remarks
 * projectId references Project with cascade delete.
 * userId references a user id (no FK constraint yet).
 * Unique constraint on (projectId, userId) prevents duplicate memberships.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const ProjectMember = pgTable(
  'project_member',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id')
      .notNull()
      .references(() => Project.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    role: text('role').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull(),
  },
  (table) => [unique().on(table.projectId, table.userId)],
)

/**
 * Zod schema for selecting a ProjectMember from the database.
 * Inferred from the Drizzle table definition — stays in sync automatically.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const ProjectMemberSelectSchema = createSelectSchema(ProjectMember)

/**
 * Zod schema for inserting a new ProjectMember into the database.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const ProjectMemberInsertSchema = createInsertSchema(ProjectMember, {
  role: z.enum(['member', 'viewer']),
})

/**
 * TypeScript type for a ProjectMember record as selected from the database.
 * Narrows role to union literal values.
 */
type ProjectMemberRecord = Omit<z.infer<typeof ProjectMemberSelectSchema>, 'role'> & {
  role: 'member' | 'viewer'
}

/**
 * TypeScript type for inserting a new ProjectMember record.
 */
type ProjectMemberInsert = z.infer<typeof ProjectMemberInsertSchema>

export { ProjectMember, ProjectMemberSelectSchema, ProjectMemberInsertSchema }
export type { ProjectMemberRecord, ProjectMemberInsert }
