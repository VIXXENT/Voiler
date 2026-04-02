import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import type { AuthSession } from '../../auth/types.js'
import { authedProcedure, router } from '../context.js'

/**
 * Session record as returned by Better Auth's
 * list-sessions endpoint. Matches AuthSession shape.
 */
type SessionRecord = AuthSession

/**
 * Dependencies for the session router factory.
 *
 * Each function wraps a Better Auth API call,
 * keeping the router decoupled from the auth
 * implementation.
 */
interface CreateSessionRouterParams {
  readonly listSessions: (params: { headers: Headers }) => Promise<SessionRecord[]>
  readonly revokeSession: (params: {
    headers: Headers
    token: string
  }) => Promise<{ status: boolean }>
  readonly revokeOtherSessions: (params: { headers: Headers }) => Promise<{ status: boolean }>
  readonly revokeSessions: (params: { headers: Headers }) => Promise<{ status: boolean }>
}

/**
 * Zod schema for the revoke-session input.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const RevokeSessionInputSchema = z.object({
  token: z.string().min(1),
})

/**
 * Create the session sub-router with multi-device
 * session management procedures.
 *
 * Provides tRPC wrappers around Better Auth's
 * built-in session endpoints:
 * - list: all active sessions for current user
 * - revoke: revoke a specific session by token
 * - revokeOthers: revoke all except current session
 * - revokeAll: revoke every session (force logout)
 */
const createSessionRouter: (params: CreateSessionRouterParams) => ReturnType<typeof router> = (
  params,
) => {
  const { listSessions, revokeSession, revokeOtherSessions, revokeSessions } = params

  // eslint-disable-next-line @typescript-eslint/typedef
  const sessionRouter = router({
    list: authedProcedure.query(async (opts) => {
      try {
        const sessions: SessionRecord[] = await listSessions({
          headers: opts.ctx.headers,
        })

        return sessions
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list sessions',
        })
      }
    }),

    revoke: authedProcedure.input(RevokeSessionInputSchema).mutation(async (opts) => {
      try {
        const result: { status: boolean } = await revokeSession({
          headers: opts.ctx.headers,
          token: opts.input.token,
        })

        if (!result.status) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Session not found or already revoked',
          })
        }

        return result
      } catch (error: unknown) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to revoke session',
        })
      }
    }),

    revokeOthers: authedProcedure.mutation(async (opts) => {
      try {
        const result: { status: boolean } = await revokeOtherSessions({
          headers: opts.ctx.headers,
        })

        return result
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to revoke other sessions',
        })
      }
    }),

    revokeAll: authedProcedure.mutation(async (opts) => {
      try {
        const result: { status: boolean } = await revokeSessions({
          headers: opts.ctx.headers,
        })

        return result
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to revoke all sessions',
        })
      }
    }),
  })

  return sessionRouter
}

export { createSessionRouter }
export type { CreateSessionRouterParams, SessionRecord }
