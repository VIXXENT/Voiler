import { TRPCError } from '@trpc/server'
import type { AppError } from '@voiler/core'
import type { UserEntity } from '@voiler/domain'
import {
  CreateUserInputSchema,
  PaginationInputSchema,
  type PaginationInput,
  type PublicUser,
} from '@voiler/schema'
import type { ResultAsync } from 'neverthrow'
import { z } from 'zod'

import { adminProcedure, authedProcedure, router } from '../context.js'

/**
 * Dependencies for the user router factory.
 */
interface CreateUserRouterParams {
  readonly createUser: (params: {
    name: string
    email: string
    requestId?: string
    userId?: string
  }) => ResultAsync<UserEntity, AppError>
  readonly getUser: (params: {
    id: string
    requestId?: string
    userId?: string
  }) => ResultAsync<UserEntity | null, AppError>
  readonly listUsers: (params: {
    pagination: PaginationInput
  }) => ResultAsync<UserEntity[], AppError>
}

/**
 * Map an AppError tag to the appropriate tRPC error code.
 */
const mapErrorCode: (params: { tag: AppError['tag'] }) => TRPCError['code'] = (params) => {
  switch (params.tag) {
    case 'UserNotFound':
    case 'ProjectNotFound':
    case 'TaskNotFound':
    case 'MemberNotFound':
      return 'NOT_FOUND'
    case 'UserAlreadyExists':
    case 'AlreadyMember':
      return 'CONFLICT'
    case 'InsufficientPermission':
    case 'NotAMember':
      return 'FORBIDDEN'
    case 'InvalidEmail':
    case 'InvalidPassword':
    case 'InvalidUserId':
    case 'WeakPassword':
    case 'ValidationError':
    case 'InvalidStatusTransition':
    case 'InvalidAssignment':
    case 'InvalidProjectName':
    case 'InvalidTaskTitle':
    case 'CannotRemoveOwner':
      return 'BAD_REQUEST'
    case 'InfrastructureError':
      return 'INTERNAL_SERVER_ERROR'
    default: {
      const _exhaustive: never = params.tag
      return _exhaustive
    }
  }
}

/**
 * Map a domain UserEntity to a client-safe PublicUser.
 */
const mapToPublicUser: (params: { entity: UserEntity }) => PublicUser = (params) => ({
  id: String(params.entity.id),
  name: params.entity.name,
  email: String(params.entity.email),
  role: params.entity.role,
  createdAt: params.entity.createdAt,
})

/**
 * Throw a TRPCError from an AppError.
 * Used inside `.match()` error branches.
 */
const throwTrpcError: (params: { error: AppError }) => never = (params) => {
  const code: TRPCError['code'] = mapErrorCode({
    tag: params.error.tag,
  })

  // Sanitize infrastructure errors — never leak
  // internal details (DB messages, stack traces).
  const message: string =
    params.error.tag === 'InfrastructureError' ? 'Internal server error' : params.error.message

  throw new TRPCError({ code, message })
}

/**
 * Create the user sub-router with CRUD procedures.
 *
 * Receives use-case functions via dependency injection
 * to keep the router decoupled from infrastructure.
 */
const createUserRouter: (params: CreateUserRouterParams) => ReturnType<typeof router> = (
  params,
) => {
  const { createUser, getUser, listUsers } = params

  const userRouter = router({
    create: adminProcedure.input(CreateUserInputSchema).mutation(async (opts) => {
      const result: Awaited<ReturnType<typeof createUser>> = await createUser({
        name: opts.input.name,
        email: opts.input.email,
      })

      return result.match(
        (entity) => mapToPublicUser({ entity }),
        (error) => throwTrpcError({ error }),
      )
    }),

    getById: authedProcedure.input(z.object({ id: z.string().min(1) })).query(async (opts) => {
      const result: Awaited<ReturnType<typeof getUser>> = await getUser({ id: opts.input.id })

      return result.match(
        (entity) => {
          if (entity === null) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'User not found',
            })
          }

          return mapToPublicUser({ entity })
        },
        (error) => throwTrpcError({ error }),
      )
    }),

    list: adminProcedure.input(PaginationInputSchema.optional()).query(async (opts) => {
      const pagination: PaginationInput = opts.input ?? {
        page: 1,
        pageSize: 20,
      }
      const result: Awaited<ReturnType<typeof listUsers>> = await listUsers({ pagination })

      return result.match(
        (entities) => entities.map((entity) => mapToPublicUser({ entity })),
        (error) => throwTrpcError({ error }),
      )
    }),
  })

  return userRouter
}

export { createUserRouter, mapToPublicUser }
export { mapErrorCode, throwTrpcError }
export type { CreateUserRouterParams }
