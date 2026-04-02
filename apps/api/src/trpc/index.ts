import { trpcServer } from '@hono/trpc-server'
import { Hono } from 'hono'

import type { DbClient } from '../db/index.js'

import type { CreateContextParams } from './context.js'
import { createContext } from './context.js'
import type { AppRouter } from './router.js'

/**
 * Parameters for mounting tRPC on a Hono app.
 */
interface CreateTrpcRouteParams {
  readonly appRouter: AppRouter
  readonly db: DbClient
}

/**
 * Create a Hono sub-app that serves the tRPC router.
 *
 * Mounts the tRPC adapter at the root of the returned
 * Hono instance. The caller should mount this under
 * a path prefix (e.g., `/trpc`).
 */
const createTrpcRoute: (params: CreateTrpcRouteParams) => Hono = (params) => {
  const { appRouter, db } = params

  // eslint-disable-next-line @typescript-eslint/typedef
  const trpcApp = new Hono()

  trpcApp.use(
    '/*',
    trpcServer({
      router: appRouter,
      // eslint-disable-next-line max-params
      createContext: (_opts, c) => {
        const requestId: string = c.get('requestId')

        const ctxParams: CreateContextParams = {
          db,
          requestId,
          user: c.get('user') ?? null,
          session: c.get('session') ?? null,
          headers: c.req.raw.headers,
        }

        return createContext(ctxParams)
      },
    }),
  )

  return trpcApp
}

export { createTrpcRoute }
export type { CreateTrpcRouteParams }

// Re-exports for convenience
export { createContext } from './context.js'
export type { TRPCContext, AuthedTRPCContext, CreateContextParams } from './context.js'

export {
  router,
  publicProcedure,
  authedProcedure,
  adminProcedure,
  devProcedure,
} from './context.js'

export { createAppRouter } from './router.js'
export type { AppRouter, CreateAppRouterParams } from './router.js'
