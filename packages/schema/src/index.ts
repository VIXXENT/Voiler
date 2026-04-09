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

export type { ProjectRecord, ProjectInsert } from './entities/project.js'

export { Task, TaskSelectSchema, TaskInsertSchema } from './entities/task.js'

export type { TaskRecord, TaskInsert } from './entities/task.js'

export {
  TaskAssignee,
  TaskAssigneeSelectSchema,
  TaskAssigneeInsertSchema,
} from './entities/task-assignee.js'

export type { TaskAssigneeRecord, TaskAssigneeInsert } from './entities/task-assignee.js'

export {
  ProjectMember,
  ProjectMemberSelectSchema,
  ProjectMemberInsertSchema,
} from './entities/project-member.js'

export type { ProjectMemberRecord, ProjectMemberSelect, ProjectMemberInsert } from './entities/project-member.js'

// --- Inputs (tRPC procedure validation) ---
export { CreateUserInputSchema } from './inputs/create-user.js'
export type { CreateUserInput } from './inputs/create-user.js'

export { UpdateUserInputSchema } from './inputs/update-user.js'
export type { UpdateUserInput } from './inputs/update-user.js'

export { PaginationInputSchema } from './inputs/pagination.js'
export type { PaginationInput } from './inputs/pagination.js'

export { CreateProjectInputSchema } from './inputs/create-project.js'
export type { CreateProjectInput } from './inputs/create-project.js'

export { CreateTaskInputSchema } from './inputs/create-task.js'
export type { CreateTaskInput } from './inputs/create-task.js'

export { UpdateTaskInputSchema } from './inputs/update-task.js'
export type { UpdateTaskInput } from './inputs/update-task.js'

export { TransitionTaskStatusInputSchema } from './inputs/transition-task-status.js'
export type { TransitionTaskStatusInput } from './inputs/transition-task-status.js'

export { AssignTaskInputSchema, UnassignTaskInputSchema } from './inputs/assign-task.js'
export type { AssignTaskInput, UnassignTaskInput } from './inputs/assign-task.js'

export { InviteToProjectInputSchema } from './inputs/invite-to-project.js'
export type { InviteToProjectInput } from './inputs/invite-to-project.js'

export { UpdateMemberRoleInputSchema } from './inputs/update-member-role.js'
export type { UpdateMemberRoleInput } from './inputs/update-member-role.js'

export { TransferOwnershipInputSchema } from './inputs/transfer-ownership.js'
export type { TransferOwnershipInput } from './inputs/transfer-ownership.js'

// --- Outputs (client-safe response schemas) ---
export { PublicUserSchema } from './outputs/public-user.js'
export type { PublicUser } from './outputs/public-user.js'

export { PublicProjectSchema } from './outputs/public-project.js'
export type { PublicProject } from './outputs/public-project.js'

export { PublicTaskSchema } from './outputs/public-task.js'
export type { PublicTask } from './outputs/public-task.js'

export { PublicProjectMemberSchema } from './outputs/public-project-member.js'
export type { PublicProjectMember } from './outputs/public-project-member.js'
