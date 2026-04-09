/**
 * @module @voiler/schema
 *
 * Zod + Drizzle schemas — single source of truth for all entities.
 * Drizzle owns table definitions, Zod owns validation rules.
 * Types are inferred from schemas — never manually defined.
 *
 * @example
 * ```ts
 * import { User, UserSelectSchema } from '@voiler/schema'
 * // User = Drizzle pgTable (for queries)
 * // UserSelectSchema = Zod schema (for validation)
 * ```
 */

// --- Entities (Drizzle + drizzle-zod) ---
export { User, UserSelectSchema, UserInsertSchema } from './entities/user.js'

export type { UserSelect, UserInsert } from './entities/user.js'

export { Session, Account, Verification } from './entities/auth.js'

export { AuditLog } from './entities/audit-log.js'

export { Project, ProjectSelectSchema, ProjectInsertSchema } from './entities/project.js'

export type { ProjectSelect, ProjectInsert } from './entities/project.js'

export { Task, TaskSelectSchema, TaskInsertSchema } from './entities/task.js'

export type { TaskSelect, TaskInsert } from './entities/task.js'

export {
  TaskAssignee,
  TaskAssigneeSelectSchema,
  TaskAssigneeInsertSchema,
} from './entities/task-assignee.js'

export type { TaskAssigneeSelect, TaskAssigneeInsert } from './entities/task-assignee.js'

// --- Inputs (tRPC procedure validation) ---
export { CreateUserInputSchema } from './inputs/create-user.js'
export type { CreateUserInput } from './inputs/create-user.js'

export { UpdateUserInputSchema } from './inputs/update-user.js'
export type { UpdateUserInput } from './inputs/update-user.js'

export { PaginationInputSchema } from './inputs/pagination.js'
export type { PaginationInput } from './inputs/pagination.js'

// --- Outputs (client-safe response schemas) ---
export { PublicUserSchema } from './outputs/public-user.js'
export type { PublicUser } from './outputs/public-user.js'
