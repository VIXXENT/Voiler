import type { AppError, ProjectMemberRecord, ProjectRecord } from '@voiler/core'
import {
  InviteToProjectInputSchema,
  TransferOwnershipInputSchema,
  UpdateMemberRoleInputSchema,
  type PublicProjectMember,
} from '@voiler/schema'
import type { ResultAsync } from 'neverthrow'
import { z } from 'zod'

import { authedProcedure, router } from '../context.js'

import { mapToPublicProject } from './project.js'
import { throwTrpcError } from './user.js'

/**
 * Maps a ProjectMemberRecord to a PublicProjectMember output shape.
 */
const mapToPublicMember: (params: { record: ProjectMemberRecord }) => PublicProjectMember = (
  params,
) => ({
  id: params.record.id,
  projectId: params.record.projectId,
  userId: params.record.userId,
  role: params.record.role,
  joinedAt: params.record.joinedAt,
})

/**
 * Dependencies for the member router factory.
 */
interface CreateMemberRouterParams {
  readonly inviteToProject: (params: {
    userId: string
    projectId: string
    targetUserId: string
    role: 'member' | 'viewer'
  }) => ResultAsync<ProjectMemberRecord, AppError>
  readonly removeFromProject: (params: {
    userId: string
    projectId: string
    targetUserId: string
  }) => ResultAsync<void, AppError>
  readonly listProjectMembers: (params: {
    userId: string
    projectId: string
  }) => ResultAsync<ProjectMemberRecord[], AppError>
  readonly updateMemberRole: (params: {
    userId: string
    projectId: string
    targetUserId: string
    newRole: 'member' | 'viewer'
  }) => ResultAsync<ProjectMemberRecord, AppError>
  readonly transferOwnership: (params: {
    userId: string
    projectId: string
    newOwnerId: string
  }) => ResultAsync<ProjectRecord, AppError>
}

/**
 * Create the member sub-router with membership management procedures.
 *
 * Receives use-case functions via dependency injection
 * to keep the router decoupled from infrastructure.
 */
const createMemberRouter: (params: CreateMemberRouterParams) => ReturnType<typeof router> = (
  params,
) => {
  const {
    inviteToProject,
    removeFromProject,
    listProjectMembers,
    updateMemberRole,
    transferOwnership,
  } = params

  const memberRouter = router({
    invite: authedProcedure.input(InviteToProjectInputSchema).mutation(async (opts) => {
      const result: Awaited<ReturnType<typeof inviteToProject>> = await inviteToProject({
        userId: opts.ctx.user.id,
        projectId: opts.input.projectId,
        targetUserId: opts.input.targetUserId,
        role: opts.input.role,
      })

      return result.match(
        (record) => mapToPublicMember({ record }),
        (error) => throwTrpcError({ error }),
      )
    }),

    remove: authedProcedure
      .input(z.object({ projectId: z.string().min(1), targetUserId: z.string().min(1) }))
      .mutation(async (opts) => {
        const result: Awaited<ReturnType<typeof removeFromProject>> = await removeFromProject({
          userId: opts.ctx.user.id,
          projectId: opts.input.projectId,
          targetUserId: opts.input.targetUserId,
        })

        return result.match(
          () => null,
          (error) => throwTrpcError({ error }),
        )
      }),

    list: authedProcedure.input(z.object({ projectId: z.string().min(1) })).query(async (opts) => {
      const result: Awaited<ReturnType<typeof listProjectMembers>> = await listProjectMembers({
        userId: opts.ctx.user.id,
        projectId: opts.input.projectId,
      })

      return result.match(
        (records) => records.map((record) => mapToPublicMember({ record })),
        (error) => throwTrpcError({ error }),
      )
    }),

    updateRole: authedProcedure.input(UpdateMemberRoleInputSchema).mutation(async (opts) => {
      const result: Awaited<ReturnType<typeof updateMemberRole>> = await updateMemberRole({
        userId: opts.ctx.user.id,
        projectId: opts.input.projectId,
        targetUserId: opts.input.targetUserId,
        newRole: opts.input.newRole,
      })

      return result.match(
        (record) => mapToPublicMember({ record }),
        (error) => throwTrpcError({ error }),
      )
    }),

    transferOwnership: authedProcedure
      .input(TransferOwnershipInputSchema)
      .mutation(async (opts) => {
        const result: Awaited<ReturnType<typeof transferOwnership>> = await transferOwnership({
          userId: opts.ctx.user.id,
          projectId: opts.input.projectId,
          newOwnerId: opts.input.newOwnerId,
        })

        return result.match(
          (record) => mapToPublicProject({ record }),
          (error) => throwTrpcError({ error }),
        )
      }),
  })

  return memberRouter
}

export { createMemberRouter }
export type { CreateMemberRouterParams }
