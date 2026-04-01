import { TRPCError } from '@trpc/server'
import type { AppError } from '@voiler/core'
import type { UserEntity } from '@voiler/domain'
import type { PublicUser } from '@voiler/schema'
import { CreateUserInputSchema } from '@voiler/schema'
import type { ResultAsync } from 'neverthrow'
import { z } from 'zod'

import { publicProcedure, router } from '../context.js'

/**
 * Dependencies for the user router factory.
 */
interface CreateUserRouterParams {
  readonly createUser: (params: {
    name: string
    email: string
    password: string
  }) => ResultAsync<UserEntity, AppError>
  readonly getUser: (params: { id: string }) => ResultAsync<UserEntity | null, AppError>
  readonly listUsers: () => ResultAsync<UserEntity[], AppError>
}

/**
 * Map an AppError tag to the appropriate tRPC error code.
 */
const mapErrorCode: (params: { tag: AppError['tag'] }) => TRPCError['code'] = (params) => {
  switch (params.tag) {
    case 'UserNotFound':
      return 'NOT_FOUND'
    case 'UserAlreadyExists':
      return 'CONFLICT'
    case 'InvalidEmail':
    case 'InvalidPassword':
    case 'WeakPassword':
    case 'ValidationError':
      return 'BAD_REQUEST'
    case 'InfrastructureError':
      return 'INTERNAL_SERVER_ERROR'
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
  throw new TRPCError({
    code: mapErrorCode({ tag: params.error.tag }),
    message: params.error.message,
  })
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

  // eslint-disable-next-line @typescript-eslint/typedef
  const userRouter = router({
    create: publicProcedure.input(CreateUserInputSchema).mutation(async (opts) => {
      const result: Awaited<ReturnType<typeof createUser>> = await createUser({
        name: opts.input.name,
        email: opts.input.email,
        password: opts.input.password,
      })

      return result.match(
        (entity) => mapToPublicUser({ entity }),
        (error) => throwTrpcError({ error }),
      )
    }),

    getById: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async (opts) => {
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

    list: publicProcedure.query(async () => {
      const result: Awaited<ReturnType<typeof listUsers>> = await listUsers()

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
