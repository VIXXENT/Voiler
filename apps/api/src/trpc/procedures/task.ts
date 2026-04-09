import type { AppError } from '@voiler/core'
import {
  AssignTaskInputSchema,
  CreateTaskInputSchema,
  TransitionTaskStatusInputSchema,
  UnassignTaskInputSchema,
  UpdateTaskInputSchema,
  type PublicTask,
  type TaskAssigneeRecord,
  type TaskRecord,
} from '@voiler/schema'
import type { ResultAsync } from 'neverthrow'
import { z } from 'zod'

import { authedProcedure, router } from '../context.js'

import { throwTrpcError } from './user.js'

/**
 * Maps a TaskRecord to a PublicTask output shape.
 */
const mapToPublicTask: (params: { record: TaskRecord }) => PublicTask = (params) => ({
  id: params.record.id,
  projectId: params.record.projectId,
  title: params.record.title,
  description: params.record.description,
  status: params.record.status,
  priority: params.record.priority,
  dueDate: params.record.dueDate,
  createdBy: params.record.createdBy,
  createdAt: params.record.createdAt,
  updatedAt: params.record.updatedAt,
})

/**
 * Dependencies for the task router factory.
 */
interface CreateTaskRouterParams {
  readonly createTask: (params: {
    userId: string
    projectId: string
    title: string
    description?: string
    priority?: 'low' | 'medium' | 'high'
    dueDate?: Date
  }) => ResultAsync<TaskRecord, AppError>
  readonly updateTask: (params: {
    userId: string
    taskId: string
    title?: string
    description?: string
    priority?: 'low' | 'medium' | 'high'
    dueDate?: Date | null
  }) => ResultAsync<TaskRecord, AppError>
  readonly transitionTaskStatus: (params: {
    userId: string
    taskId: string
    newStatus: 'todo' | 'in_progress' | 'done'
  }) => ResultAsync<TaskRecord, AppError>
  readonly deleteTask: (params: {
    userId: string
    taskId: string
  }) => ResultAsync<void, AppError>
  readonly listProjectTasks: (params: {
    userId: string
    projectId: string
    filters?: {
      status?: 'todo' | 'in_progress' | 'done'
      priority?: 'low' | 'medium' | 'high'
      assigneeId?: string
    }
  }) => ResultAsync<TaskRecord[], AppError>
  readonly assignToTask: (params: {
    userId: string
    taskId: string
    targetUserId: string
    role: 'responsible' | 'reviewer' | 'collaborator'
  }) => ResultAsync<TaskAssigneeRecord, AppError>
  readonly unassignFromTask: (params: {
    userId: string
    taskId: string
    targetUserId: string
  }) => ResultAsync<void, AppError>
}

/**
 * Create the task sub-router with full CRUD + assignment procedures.
 *
 * Receives use-case functions via dependency injection
 * to keep the router decoupled from infrastructure.
 */
const createTaskRouter: (params: CreateTaskRouterParams) => ReturnType<typeof router> = (
  params,
) => {
  const {
    createTask,
    updateTask,
    transitionTaskStatus,
    deleteTask,
    listProjectTasks,
    assignToTask,
    unassignFromTask,
  } = params

  const taskRouter = router({
    create: authedProcedure.input(CreateTaskInputSchema).mutation(async (opts) => {
      const result: Awaited<ReturnType<typeof createTask>> = await createTask({
        userId: opts.ctx.user.id,
        projectId: opts.input.projectId,
        title: opts.input.title,
        description: opts.input.description,
        priority: opts.input.priority,
        dueDate: opts.input.dueDate,
      })

      return result.match(
        (record) => mapToPublicTask({ record }),
        (error) => throwTrpcError({ error }),
      )
    }),

    update: authedProcedure.input(UpdateTaskInputSchema).mutation(async (opts) => {
      const result: Awaited<ReturnType<typeof updateTask>> = await updateTask({
        userId: opts.ctx.user.id,
        taskId: opts.input.taskId,
        title: opts.input.title,
        description: opts.input.description,
        priority: opts.input.priority,
        dueDate: opts.input.dueDate,
      })

      return result.match(
        (record) => mapToPublicTask({ record }),
        (error) => throwTrpcError({ error }),
      )
    }),

    transition: authedProcedure
      .input(TransitionTaskStatusInputSchema)
      .mutation(async (opts) => {
        const result: Awaited<ReturnType<typeof transitionTaskStatus>> =
          await transitionTaskStatus({
            userId: opts.ctx.user.id,
            taskId: opts.input.taskId,
            newStatus: opts.input.newStatus,
          })

        return result.match(
          (record) => mapToPublicTask({ record }),
          (error) => throwTrpcError({ error }),
        )
      }),

    delete: authedProcedure
      .input(z.object({ taskId: z.string().min(1) }))
      .mutation(async (opts) => {
        const result: Awaited<ReturnType<typeof deleteTask>> = await deleteTask({
          userId: opts.ctx.user.id,
          taskId: opts.input.taskId,
        })

        return result.match(
          () => null,
          (error) => throwTrpcError({ error }),
        )
      }),

    list: authedProcedure
      .input(
        z.object({
          projectId: z.string().min(1),
          status: z.enum(['todo', 'in_progress', 'done']).optional(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
          assigneeId: z.string().optional(),
        }),
      )
      .query(async (opts) => {
        const result: Awaited<ReturnType<typeof listProjectTasks>> = await listProjectTasks({
          userId: opts.ctx.user.id,
          projectId: opts.input.projectId,
          filters: {
            status: opts.input.status,
            priority: opts.input.priority,
            assigneeId: opts.input.assigneeId,
          },
        })

        return result.match(
          (records) => records.map((record) => mapToPublicTask({ record })),
          (error) => throwTrpcError({ error }),
        )
      }),

    assign: authedProcedure.input(AssignTaskInputSchema).mutation(async (opts) => {
      const result: Awaited<ReturnType<typeof assignToTask>> = await assignToTask({
        userId: opts.ctx.user.id,
        taskId: opts.input.taskId,
        targetUserId: opts.input.targetUserId,
        role: opts.input.role,
      })

      return result.match(
        () => null,
        (error) => throwTrpcError({ error }),
      )
    }),

    unassign: authedProcedure.input(UnassignTaskInputSchema).mutation(async (opts) => {
      const result: Awaited<ReturnType<typeof unassignFromTask>> = await unassignFromTask({
        userId: opts.ctx.user.id,
        taskId: opts.input.taskId,
        targetUserId: opts.input.targetUserId,
      })

      return result.match(
        () => null,
        (error) => throwTrpcError({ error }),
      )
    }),
  })

  return taskRouter
}

export { createTaskRouter, mapToPublicTask }
export type { CreateTaskRouterParams }
