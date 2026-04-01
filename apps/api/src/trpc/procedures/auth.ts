import type { AppError } from '@voiler/core'
import type { UserEntity } from '@voiler/domain'
import type { AuthResponse } from '@voiler/schema'
import { LoginInputSchema } from '@voiler/schema'
import type { ResultAsync } from 'neverthrow'

import { publicProcedure, router } from '../context.js'

import { mapToPublicUser, throwTrpcError } from './user.js'

/**
 * Successful authentication result from the use case.
 */
interface AuthUseCaseResult {
  readonly token: string
  readonly user: UserEntity
}

/**
 * Dependencies for the auth router factory.
 */
interface CreateAuthRouterParams {
  readonly authenticate: (params: {
    email: string
    password: string
  }) => ResultAsync<AuthUseCaseResult, AppError>
}

/**
 * Create the auth sub-router with login procedure.
 *
 * Receives the authenticate use case via dependency
 * injection to keep the router decoupled from
 * infrastructure.
 */
const createAuthRouter: (params: CreateAuthRouterParams) => ReturnType<typeof router> = (
  params,
) => {
  const { authenticate } = params

  // eslint-disable-next-line @typescript-eslint/typedef
  const authRouter = router({
    login: publicProcedure.input(LoginInputSchema).mutation(async (opts) => {
      const result: Awaited<ReturnType<typeof authenticate>> = await authenticate({
        email: opts.input.email,
        password: opts.input.password,
      })

      return result.match(
        (authResult): AuthResponse => ({
          token: authResult.token,
          user: mapToPublicUser({
            entity: authResult.user,
          }),
        }),
        (error) => throwTrpcError({ error }),
      )
    }),
  })

  return authRouter
}

export { createAuthRouter }
export type { CreateAuthRouterParams }
