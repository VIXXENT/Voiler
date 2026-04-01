import { initTRPC } from '@trpc/server'

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
}

/**
 * Parameters for creating a tRPC context.
 */
interface CreateContextParams {
  readonly db: DbClient
  readonly requestId: string
}

/**
 * Create a tRPC context from the Hono request.
 */
const createContext: (params: CreateContextParams) => TRPCContext = (params) => ({
  db: params.db,
  requestId: params.requestId,
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
 * Authenticated procedure placeholder.
 * Actual auth check will be added in Plan C.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const authedProcedure = t.procedure

/**
 * Admin procedure placeholder.
 * Actual role check will be added in Plan C.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const adminProcedure = t.procedure

/**
 * Dev-only procedure placeholder.
 * Actual environment check will be added in Plan C.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const devProcedure = t.procedure

export { createContext, router, publicProcedure }
export { authedProcedure, adminProcedure, devProcedure }
export type { TRPCContext, CreateContextParams }
