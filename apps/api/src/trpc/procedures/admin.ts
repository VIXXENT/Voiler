import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { writeAuditLog } from '../../logging/index.js'
import { adminProcedure, authedProcedure, router } from '../context.js'

/**
 * Dependencies for the admin router factory.
 *
 * Each function wraps a Better Auth admin API call,
 * keeping the router decoupled from the auth
 * implementation.
 *
 * Return types use `Record<string, unknown>` so the
 * router stays decoupled from Better Auth internals.
 */
interface CreateAdminRouterParams {
  readonly impersonateUser: (params: {
    headers: Headers
    userId: string
  }) => Promise<Record<string, unknown>>
  readonly stopImpersonating: (params: { headers: Headers }) => Promise<Record<string, unknown>>
}

/**
 * Zod schema for the impersonate input.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const ImpersonateInputSchema = z.object({
  userId: z.string().min(1),
})

/**
 * Create the admin sub-router with impersonation
 * procedures and audit logging.
 *
 * Provides tRPC wrappers around Better Auth's
 * built-in admin plugin endpoints:
 * - impersonate: start impersonating a user (admin only)
 * - stopImpersonating: stop impersonation (any authed user)
 */
const createAdminRouter: (params: CreateAdminRouterParams) => ReturnType<typeof router> = (
  params,
) => {
  const { impersonateUser, stopImpersonating } = params

  // eslint-disable-next-line @typescript-eslint/typedef
  const adminRouter = router({
    impersonate: adminProcedure.input(ImpersonateInputSchema).mutation(async (opts) => {
      try {
        await impersonateUser({
          headers: opts.ctx.headers,
          userId: opts.input.userId,
        })
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to impersonate user',
        })
      }

      writeAuditLog({
        db: opts.ctx.db,
        entry: {
          requestId: opts.ctx.requestId,
          action: 'admin.impersonate',
          userId: opts.ctx.user.id,
          entityId: opts.input.userId,
          metadata: {
            impersonatedBy: opts.ctx.user.id,
          },
        },
      })

      return { success: true }
    }),

    stopImpersonating: authedProcedure.mutation(async (opts) => {
      try {
        await stopImpersonating({
          headers: opts.ctx.headers,
        })
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to stop impersonating',
        })
      }

      writeAuditLog({
        db: opts.ctx.db,
        entry: {
          requestId: opts.ctx.requestId,
          action: 'admin.stopImpersonating',
          userId: opts.ctx.user.id,
          metadata: {
            impersonatedBy: opts.ctx.session.impersonatedBy ?? null,
          },
        },
      })

      return { success: true }
    }),
  })

  return adminRouter
}

export { createAdminRouter }
export type { CreateAdminRouterParams }
