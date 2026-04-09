/**
 * @module use-cases
 *
 * Business logic layer. Each use case depends only on
 * port interfaces from @voiler/core — never on concrete
 * adapters. All use cases return ResultAsync<T, AppError>.
 */

// User
export { createCreateUser } from './user/create-user.js'
export { createGetUser } from './user/get-user.js'
export { createListUsers } from './user/list-users.js'

// Project
export { createCreateProject } from './project/create-project.js'
export { createGetProject } from './project/get-project.js'
export { createListUserProjects } from './project/list-user-projects.js'
export { createArchiveProject } from './project/archive-project.js'
export { createDeleteProject } from './project/delete-project.js'

// Task
export { createCreateTask } from './task/create-task.js'
export { createUpdateTask } from './task/update-task.js'
export { createTransitionTaskStatus } from './task/transition-task-status.js'
export { createDeleteTask } from './task/delete-task.js'
export { createListProjectTasks } from './task/list-project-tasks.js'
export { createAssignToTask } from './task/assign-to-task.js'
export { createUnassignFromTask } from './task/unassign-from-task.js'
