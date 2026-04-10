import type {
  AppError,
  CheckoutSessionResult,
  ProjectMemberRecord,
  SubscriptionRecord,
} from '@voiler/core'
import type { UserEntity } from '@voiler/domain'
import { createStubPaymentService } from '@voiler/mod-payments'
import type { IPaymentService } from '@voiler/mod-payments'
import type { ProjectRecord, TaskAssigneeRecord, TaskRecord } from '@voiler/schema'
import type { ResultAsync } from 'neverthrow'

import { createStripeBillingService } from './adapters/billing/stripe-billing-service.js'
import { createDrizzleProjectMemberRepository } from './adapters/db/drizzle-project-member-repository.js'
import { createDrizzleProjectRepository } from './adapters/db/drizzle-project-repository.js'
import { createDrizzleTaskAssigneeRepository } from './adapters/db/drizzle-task-assignee-repository.js'
import { createDrizzleTaskRepository } from './adapters/db/drizzle-task-repository.js'
import { createDrizzleUserRepository } from './adapters/db/drizzle-user-repository.js'
import { createDrizzleUserSubscriptionRepository } from './adapters/db/drizzle-user-subscription-repository.js'
import type { DbClient } from './db/index.js'
import { withAuditLog, type AuditableParams } from './logging/use-case-logger.js'
import {
  createArchiveProject,
  createAssignToTask,
  createCancelSubscription,
  createCreateCheckoutSession,
  createCreateProject,
  createCreateTask,
  createCreateUser,
  createDeleteProject,
  createDeleteTask,
  createDeleteUserData,
  createFreezeUserProjects,
  createUnfreezeUserProjects,
  createGetProject,
  createGetSubscription,
  createGetUser,
  createHandleStripeWebhook,
  createInviteToProject,
  createListProjectMembers,
  createListProjectTasks,
  createListUserProjects,
  createListUsers,
  createRemoveFromProject,
  createTransferOwnership,
  createTransitionTaskStatus,
  createUnassignFromTask,
  createUpdateMemberRole,
  createUpdateTask,
} from './use-cases/index.js'

/**
 * Parameters for building the DI container.
 */
interface CreateContainerParams {
  readonly db: DbClient
}

/**
 * Application DI container.
 *
 * Exposes pre-wired use-case functions ready for
 * injection into tRPC procedures.
 */
interface Container {
  readonly createUser: (
    params: {
      name: string
      email: string
    } & AuditableParams,
  ) => ResultAsync<UserEntity, AppError>
  readonly getUser: (
    params: { id: string } & AuditableParams,
  ) => ResultAsync<UserEntity | null, AppError>
  readonly listUsers: (params: {
    pagination: { page: number; pageSize: number }
  }) => ResultAsync<UserEntity[], AppError>
  readonly paymentService: IPaymentService
  // --- Project use-cases ---
  readonly createProject: (
    params: { userId: string; name: string; description?: string } & AuditableParams,
  ) => ResultAsync<ProjectRecord, AppError>
  readonly getProject: (params: {
    userId: string
    projectId: string
  }) => ResultAsync<ProjectRecord, AppError>
  readonly listUserProjects: (params: { userId: string }) => ResultAsync<ProjectRecord[], AppError>
  readonly archiveProject: (
    params: { userId: string; projectId: string } & AuditableParams,
  ) => ResultAsync<ProjectRecord, AppError>
  readonly deleteProject: (
    params: { userId: string; projectId: string } & AuditableParams,
  ) => ResultAsync<void, AppError>
  // --- Task use-cases ---
  readonly createTask: (
    params: {
      userId: string
      projectId: string
      title: string
      description?: string
      priority?: 'low' | 'medium' | 'high'
      dueDate?: Date
    } & AuditableParams,
  ) => ResultAsync<TaskRecord, AppError>
  readonly updateTask: (
    params: {
      userId: string
      taskId: string
      title?: string
      description?: string
      priority?: 'low' | 'medium' | 'high'
      dueDate?: Date | null
    } & AuditableParams,
  ) => ResultAsync<TaskRecord, AppError>
  readonly transitionTaskStatus: (
    params: {
      userId: string
      taskId: string
      newStatus: 'todo' | 'in_progress' | 'done'
    } & AuditableParams,
  ) => ResultAsync<TaskRecord, AppError>
  readonly deleteTask: (
    params: { userId: string; taskId: string } & AuditableParams,
  ) => ResultAsync<void, AppError>
  readonly listProjectTasks: (params: {
    userId: string
    projectId: string
    filters?: {
      status?: 'todo' | 'in_progress' | 'done'
      priority?: 'low' | 'medium' | 'high'
      assigneeId?: string
    }
  }) => ResultAsync<TaskRecord[], AppError>
  readonly assignToTask: (
    params: {
      userId: string
      taskId: string
      targetUserId: string
      role: 'responsible' | 'reviewer' | 'collaborator'
    } & AuditableParams,
  ) => ResultAsync<TaskAssigneeRecord, AppError>
  readonly unassignFromTask: (
    params: {
      userId: string
      taskId: string
      targetUserId: string
    } & AuditableParams,
  ) => ResultAsync<void, AppError>
  // --- Member use-cases ---
  readonly inviteToProject: (
    params: {
      userId: string
      projectId: string
      targetUserId: string
      role: 'member' | 'viewer'
    } & AuditableParams,
  ) => ResultAsync<ProjectMemberRecord, AppError>
  readonly removeFromProject: (
    params: {
      userId: string
      projectId: string
      targetUserId: string
    } & AuditableParams,
  ) => ResultAsync<void, AppError>
  readonly listProjectMembers: (params: {
    userId: string
    projectId: string
  }) => ResultAsync<ProjectMemberRecord[], AppError>
  readonly updateMemberRole: (
    params: {
      userId: string
      projectId: string
      targetUserId: string
      newRole: 'member' | 'viewer'
    } & AuditableParams,
  ) => ResultAsync<ProjectMemberRecord, AppError>
  readonly transferOwnership: (
    params: {
      userId: string
      projectId: string
      newOwnerId: string
    } & AuditableParams,
  ) => ResultAsync<ProjectRecord, AppError>
  readonly deleteUserData: (
    params: { userId: string } & AuditableParams,
  ) => ResultAsync<void, AppError>
  // --- Subscription use-cases ---
  readonly getSubscription: (params: {
    userId: string
  }) => ResultAsync<SubscriptionRecord, AppError>
  readonly createCheckoutSession: (params: {
    userId: string
    plan: 'pro'
    successUrl: string
    cancelUrl: string
    requestId?: string
  }) => ResultAsync<CheckoutSessionResult, AppError>
  readonly cancelSubscription: (params: {
    userId: string
    requestId?: string
  }) => ResultAsync<void, AppError>
  readonly handleStripeWebhook: (params: {
    type: string
    data: Record<string, unknown>
  }) => ResultAsync<void, AppError>
  readonly freezeUserProjects: (params: { userId: string }) => ResultAsync<void, AppError>
  readonly unfreezeUserProjects: (params: { userId: string }) => ResultAsync<void, AppError>
}

/**
 * Build the application DI container.
 *
 * This is the ONLY file that imports concrete adapter
 * implementations. All other modules depend on port
 * interfaces defined in @voiler/core.
 */
const createContainer: (params: CreateContainerParams) => Container = (params) => {
  const { db } = params

  // --- Adapters ---

  const paymentService = createStubPaymentService()
  const billingService = createStripeBillingService()

  const userRepository = createDrizzleUserRepository({ db })
  const projectRepository = createDrizzleProjectRepository({ db })
  const memberRepository = createDrizzleProjectMemberRepository({ db })
  const taskRepository = createDrizzleTaskRepository({ db })
  const taskAssigneeRepository = createDrizzleTaskAssigneeRepository({ db })
  const subscriptionRepository = createDrizzleUserSubscriptionRepository({ db })

  // --- User use-cases (raw) ---
  const rawCreateUser: Container['createUser'] = createCreateUser({ userRepository })
  const rawGetUser: Container['getUser'] = createGetUser({ userRepository })
  const rawListUsers: Container['listUsers'] = createListUsers({ userRepository })

  // --- Project use-cases (raw) ---
  const rawCreateProject = createCreateProject({
    projectRepository,
    memberRepository,
    subscriptionRepository,
  })
  const rawGetProject = createGetProject({ projectRepository, memberRepository })
  const rawListUserProjects = createListUserProjects({ projectRepository })
  const rawArchiveProject = createArchiveProject({ projectRepository })
  const rawDeleteProject = createDeleteProject({ projectRepository })

  // --- Task use-cases (raw) ---
  const rawCreateTask = createCreateTask({
    projectRepository,
    taskRepository,
    memberRepository,
    subscriptionRepository,
  })
  const rawUpdateTask = createUpdateTask({ taskRepository, projectRepository, memberRepository })
  const rawTransitionTaskStatus = createTransitionTaskStatus({
    taskRepository,
    projectRepository,
    memberRepository,
  })
  const rawDeleteTask = createDeleteTask({
    taskRepository,
    taskAssigneeRepository,
    projectRepository,
    memberRepository,
  })
  const rawListProjectTasks = createListProjectTasks({
    projectRepository,
    taskRepository,
    memberRepository,
  })
  const rawAssignToTask = createAssignToTask({
    taskRepository,
    taskAssigneeRepository,
    projectRepository,
    memberRepository,
  })
  const rawUnassignFromTask = createUnassignFromTask({
    taskRepository,
    taskAssigneeRepository,
    projectRepository,
    memberRepository,
  })

  // --- Member use-cases (raw) ---
  const rawInviteToProject = createInviteToProject({
    projectRepository,
    memberRepository,
    subscriptionRepository,
  })
  const rawRemoveFromProject = createRemoveFromProject({ projectRepository, memberRepository })
  const rawListProjectMembers = createListProjectMembers({ projectRepository, memberRepository })
  const rawUpdateMemberRole = createUpdateMemberRole({ projectRepository, memberRepository })
  const rawTransferOwnership = createTransferOwnership({ projectRepository, memberRepository })
  const rawDeleteUserData = createDeleteUserData({ projectRepository, memberRepository })

  // --- Wrap with audit logging ---
  const createUser: Container['createUser'] = withAuditLog({
    name: 'user.create',
    useCase: rawCreateUser,
    getEntityId: (result) => String(result.id),
    db,
  })

  const getUser: Container['getUser'] = withAuditLog({
    name: 'user.get',
    useCase: rawGetUser,
    getEntityId: (result) => (result ? String(result.id) : undefined),
    db,
  })

  // listUsers is a read-all query with no params —
  // audit logging is not applicable (no entity to track).
  const listUsers: Container['listUsers'] = rawListUsers

  // --- Project: mutating use-cases wrapped, read-only raw ---
  const createProject: Container['createProject'] = withAuditLog({
    name: 'project.create',
    useCase: rawCreateProject,
    getEntityId: (result) => result.id,
    db,
  })

  // read-only — no audit log
  const getProject: Container['getProject'] = rawGetProject

  // read-only — no audit log
  const listUserProjects: Container['listUserProjects'] = rawListUserProjects

  const archiveProject: Container['archiveProject'] = withAuditLog({
    name: 'project.archive',
    useCase: rawArchiveProject,
    getEntityId: (result) => result.id,
    db,
  })

  const deleteProject: Container['deleteProject'] = withAuditLog({
    name: 'project.delete',
    useCase: rawDeleteProject,
    db,
  })

  // --- Task: mutating use-cases wrapped, read-only raw ---
  const createTask: Container['createTask'] = withAuditLog({
    name: 'task.create',
    useCase: rawCreateTask,
    getEntityId: (result) => result.id,
    db,
  })

  const updateTask: Container['updateTask'] = withAuditLog({
    name: 'task.update',
    useCase: rawUpdateTask,
    getEntityId: (result) => result.id,
    db,
  })

  const transitionTaskStatus: Container['transitionTaskStatus'] = withAuditLog({
    name: 'task.transition',
    useCase: rawTransitionTaskStatus,
    getEntityId: (result) => result.id,
    db,
  })

  const deleteTask: Container['deleteTask'] = withAuditLog({
    name: 'task.delete',
    useCase: rawDeleteTask,
    db,
  })

  // read-only — no audit log
  const listProjectTasks: Container['listProjectTasks'] = rawListProjectTasks

  const assignToTask: Container['assignToTask'] = withAuditLog({
    name: 'task.assign',
    useCase: rawAssignToTask,
    getEntityId: (result) => result.id,
    db,
  })

  const unassignFromTask: Container['unassignFromTask'] = withAuditLog({
    name: 'task.unassign',
    useCase: rawUnassignFromTask,
    db,
  })

  // --- Member: mutating use-cases wrapped, read-only raw ---
  const inviteToProject: Container['inviteToProject'] = withAuditLog({
    name: 'member.invite',
    useCase: rawInviteToProject,
    getEntityId: (result) => result.id,
    db,
  })

  const removeFromProject: Container['removeFromProject'] = withAuditLog({
    name: 'member.remove',
    useCase: rawRemoveFromProject,
    db,
  })

  // read-only — no audit log
  const listProjectMembers: Container['listProjectMembers'] = rawListProjectMembers

  const updateMemberRole: Container['updateMemberRole'] = withAuditLog({
    name: 'member.updateRole',
    useCase: rawUpdateMemberRole,
    getEntityId: (result) => result.id,
    db,
  })

  const transferOwnership: Container['transferOwnership'] = withAuditLog({
    name: 'member.transferOwnership',
    useCase: rawTransferOwnership,
    getEntityId: (result) => result.id,
    db,
  })

  const deleteUserData: Container['deleteUserData'] = withAuditLog({
    name: 'member.deleteUserData',
    useCase: rawDeleteUserData,
    db,
  })

  // --- Subscription use-cases (raw) ---
  const rawGetSubscription = createGetSubscription({ subscriptionRepository })
  const rawCreateCheckoutSession = createCreateCheckoutSession({
    subscriptionRepository,
    billingService,
  })
  const rawFreezeUserProjects = createFreezeUserProjects({ projectRepository })
  const rawUnfreezeUserProjects = createUnfreezeUserProjects({ projectRepository })
  const rawCancelSubscription = createCancelSubscription({
    subscriptionRepository,
    billingService,
    freezeUserProjects: rawFreezeUserProjects,
  })
  const rawHandleStripeWebhook = createHandleStripeWebhook({
    subscriptionRepository,
    freezeUserProjects: rawFreezeUserProjects,
    unfreezeUserProjects: rawUnfreezeUserProjects,
  })

  // read-only — no audit log
  const getSubscription: Container['getSubscription'] = rawGetSubscription

  // mutating — wrap with audit log
  const createCheckoutSession: Container['createCheckoutSession'] = withAuditLog({
    name: 'subscription.checkout',
    useCase: rawCreateCheckoutSession,
    db,
  })

  const cancelSubscription: Container['cancelSubscription'] = withAuditLog({
    name: 'subscription.cancel',
    useCase: rawCancelSubscription,
    db,
  })

  // internal / webhook — not exposed via tRPC directly
  const handleStripeWebhook: Container['handleStripeWebhook'] = rawHandleStripeWebhook
  const freezeUserProjects: Container['freezeUserProjects'] = rawFreezeUserProjects
  const unfreezeUserProjects: Container['unfreezeUserProjects'] = rawUnfreezeUserProjects

  return {
    createUser,
    getUser,
    listUsers,
    paymentService,
    createProject,
    getProject,
    listUserProjects,
    archiveProject,
    deleteProject,
    createTask,
    updateTask,
    transitionTaskStatus,
    deleteTask,
    listProjectTasks,
    assignToTask,
    unassignFromTask,
    inviteToProject,
    removeFromProject,
    listProjectMembers,
    updateMemberRole,
    transferOwnership,
    deleteUserData,
    getSubscription,
    createCheckoutSession,
    cancelSubscription,
    handleStripeWebhook,
    freezeUserProjects,
    unfreezeUserProjects,
  }
}

export { createContainer }
export type { Container, CreateContainerParams }
