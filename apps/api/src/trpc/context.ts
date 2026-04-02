import { initTRPC, TRPCError } from '@trpc/server'

import type { AuthSession, AuthUser } from '../auth/types.js'
import type { DbClient } from '../db/index.js'

/**
 * tRPC context available to all procedures.
 *
 * The index signature satisfies the `Record<string, unknown>`
 * constraint required by `@hono/trpc-server`.
 */
interface TRPCContext {
  readonly [key: string]: unknown
  readonly db: DbClient
  readonly requestId: string
  readonly user: AuthUser | null
  readonly session: AuthSession | null
  readonly headers: Headers
}

/**
 * tRPC context with guaranteed non-null user and session.
 * Available inside `authedProcedure` and its derivatives.
 */
interface AuthedTRPCContext extends TRPCContext {
  readonly user: AuthUser
  readonly session: AuthSession
  readonly headers: Headers
}

/**
 * Parameters for creating a tRPC context.
 */
interface CreateContextParams {
  readonly db: DbClient
  readonly requestId: string
  readonly user: AuthUser | null
  readonly session: AuthSession | null
  readonly headers: Headers
}

/**
 * Create a tRPC context from the Hono request.
 */
const createContext: (params: CreateContextParams) => TRPCContext = (params) => ({
  db: params.db,
  requestId: params.requestId,
  user: params.user,
  session: params.session,
  headers: params.headers,
})

/**
 * Initialise tRPC with the application context type.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const t = initTRPC.context<TRPCContext>().create()

/**
 * Create a tRPC router.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const router = t.router

/**
 * Public procedure — no authentication required.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const publicProcedure = t.procedure

/**
 * Authenticated procedure — rejects with 401 if no session.
 * Narrows context to `AuthedTRPCContext` for downstream use.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const authedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.user || !opts.ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      user: opts.ctx.user,
      session: opts.ctx.session,
    },
  })
})

/**
 * Admin procedure — rejects with 403 if role is not 'admin'.
 * Requires authentication first.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const adminProcedure = authedProcedure.use(async (opts) => {
  if (opts.ctx.user.role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    })
  }

  return opts.next({ ctx: opts.ctx })
})

/**
 * Dev-only procedure — rejects with 403 if role is not 'dev'.
 * Requires authentication first.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const devProcedure = authedProcedure.use(async (opts) => {
  if (opts.ctx.user.role !== 'dev') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Developer access required',
    })
  }

  return opts.next({ ctx: opts.ctx })
})

export { createContext, router, publicProcedure }
export { authedProcedure, adminProcedure, devProcedure }
export type { TRPCContext, AuthedTRPCContext, CreateContextParams }
