import { initTRPC, TRPCError } from '@trpc/server'

import type { AuthSession, AuthUser } from '../auth/types.js'
import type { DbClient } from '../db/index.js'

/**
 * tRPC context available to all procedures.
 */
interface TRPCContext {
  readonly db: DbClient
  readonly requestId: string
  readonly user: AuthUser | null
  readonly session: AuthSession | null
  readonly headers: Headers
}

/**
 * TRPCContext extended with an index signature so it
 * satisfies `Record<string, unknown>` required by
 * `@hono/trpc-server`. Used only at the adapter boundary.
 */
type HonoTRPCContext = TRPCContext & Record<string, unknown>

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
const createContext: (params: CreateContextParams) => HonoTRPCContext = (params) => ({
  db: params.db,
  requestId: params.requestId,
  user: params.user,
  session: params.session,
  headers: params.headers,
})

/**
 * Initialise tRPC with the application context type.
 */

const t = initTRPC.context<TRPCContext>().create()

/**
 * Create a tRPC router.
 */

const router = t.router

/**
 * Public procedure — no authentication required.
 */

const publicProcedure = t.procedure

/**
 * Authenticated procedure — rejects with 401 if no session.
 * Narrows context to `AuthedTRPCContext` for downstream use.
 */

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
 * Dev procedure — rejects with 403 if role is not 'dev' or 'admin'.
 * Admin is a superset of dev access.
 * Requires authentication first.
 */

const devProcedure = authedProcedure.use(async (opts) => {
  const role: string | undefined = opts.ctx.user.role
  if (role !== 'dev' && role !== 'admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Developer access required',
    })
  }

  return opts.next({ ctx: opts.ctx })
})

export { createContext, router, publicProcedure }
export { authedProcedure, adminProcedure, devProcedure }
export type { TRPCContext, HonoTRPCContext, AuthedTRPCContext, CreateContextParams }
