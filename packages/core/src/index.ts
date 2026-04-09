/**
 * @module @voiler/core
 *
 * Core layer — port interfaces and application error union.
 * Depends only on @voiler/domain and neverthrow.
 */

// Application errors
export type { AppError, InfrastructureError, ValidationError } from './errors/app-error'
export { infrastructureError, validationError } from './errors/app-error'

// Repository ports
export type {
  CreateUserData,
  IUserRepository,
  PaginationParams,
  UpdateUserData,
} from './repositories/user.repository'

export type {
  CreateProjectData,
  IProjectRepository,
  ProjectRecord,
  UpdateProjectData,
} from './repositories/project.repository'

export type {
  CreateTaskData,
  ITaskRepository,
  TaskFilters,
  TaskRecord,
  UpdateTaskData,
} from './repositories/task.repository'

export type {
  AssignTaskData,
  ITaskAssigneeRepository,
  TaskAssigneeRecord,
} from './repositories/task-assignee.repository'
