import type { AppError } from '@voiler/core'
import { CreateProjectInputSchema, type ProjectRecord, type PublicProject } from '@voiler/schema'
import type { ResultAsync } from 'neverthrow'
import { z } from 'zod'

import { authedProcedure, router } from '../context.js'

import { throwTrpcError } from './user.js'

/**
 * Maps a ProjectRecord to a PublicProject output shape.
 */
const mapToPublicProject: (params: { record: ProjectRecord }) => PublicProject = (params) => ({
  id: params.record.id,
  name: params.record.name,
  description: params.record.description,
  ownerId: params.record.ownerId,
  status: params.record.status,
  frozen: params.record.frozen,
  createdAt: params.record.createdAt,
  updatedAt: params.record.updatedAt,
})

/**
 * Dependencies for the project router factory.
 */
interface CreateProjectRouterParams {
  readonly createProject: (params: {
    userId: string
    name: string
    description?: string
  }) => ResultAsync<ProjectRecord, AppError>
  readonly getProject: (params: {
    userId: string
    projectId: string
  }) => ResultAsync<ProjectRecord, AppError>
  readonly listUserProjects: (params: { userId: string }) => ResultAsync<ProjectRecord[], AppError>
  readonly archiveProject: (params: {
    userId: string
    projectId: string
  }) => ResultAsync<ProjectRecord, AppError>
  readonly deleteProject: (params: {
    userId: string
    projectId: string
  }) => ResultAsync<void, AppError>
}

/**
 * Create the project sub-router with CRUD + lifecycle procedures.
 *
 * Receives use-case functions via dependency injection
 * to keep the router decoupled from infrastructure.
 */
const createProjectRouter: (params: CreateProjectRouterParams) => ReturnType<typeof router> = (
  params,
) => {
  const { createProject, getProject, listUserProjects, archiveProject, deleteProject } = params

  const projectRouter = router({
    create: authedProcedure.input(CreateProjectInputSchema).mutation(async (opts) => {
      const result: Awaited<ReturnType<typeof createProject>> = await createProject({
        userId: opts.ctx.user.id,
        name: opts.input.name,
        description: opts.input.description,
      })

      return result.match(
        (record) => mapToPublicProject({ record }),
        (error) => throwTrpcError({ error }),
      )
    }),

    get: authedProcedure.input(z.object({ projectId: z.string().min(1) })).query(async (opts) => {
      const result: Awaited<ReturnType<typeof getProject>> = await getProject({
        userId: opts.ctx.user.id,
        projectId: opts.input.projectId,
      })

      return result.match(
        (record) => mapToPublicProject({ record }),
        (error) => throwTrpcError({ error }),
      )
    }),

    list: authedProcedure.query(async (opts) => {
      const result: Awaited<ReturnType<typeof listUserProjects>> = await listUserProjects({
        userId: opts.ctx.user.id,
      })

      return result.match(
        (records) => records.map((record) => mapToPublicProject({ record })),
        (error) => throwTrpcError({ error }),
      )
    }),

    archive: authedProcedure
      .input(z.object({ projectId: z.string().min(1) }))
      .mutation(async (opts) => {
        const result: Awaited<ReturnType<typeof archiveProject>> = await archiveProject({
          userId: opts.ctx.user.id,
          projectId: opts.input.projectId,
        })

        return result.match(
          (record) => mapToPublicProject({ record }),
          (error) => throwTrpcError({ error }),
        )
      }),

    delete: authedProcedure
      .input(z.object({ projectId: z.string().min(1) }))
      .mutation(async (opts) => {
        const result: Awaited<ReturnType<typeof deleteProject>> = await deleteProject({
          userId: opts.ctx.user.id,
          projectId: opts.input.projectId,
        })

        return result.match(
          () => null,
          (error) => throwTrpcError({ error }),
        )
      }),
  })

  return projectRouter
}

export { createProjectRouter, mapToPublicProject }
export type { CreateProjectRouterParams }
