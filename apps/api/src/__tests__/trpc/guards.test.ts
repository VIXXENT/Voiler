import { TRPCError } from '@trpc/server'
import { describe, it, expect } from 'vitest'

import type { AuthSession, AuthUser } from '../../auth/types.js'
import type { DbClient } from '../../db/index.js'
import { router, authedProcedure, adminProcedure, devProcedure } from '../../trpc/context.js'

/**
 * Minimal test router that exposes each guard
 * as a simple query returning a string.
 */

const testRouter = router({
  authedOnly: authedProcedure.query(() => 'authed-ok'),
  adminOnly: adminProcedure.query(() => 'admin-ok'),
  devOnly: devProcedure.query(() => 'dev-ok'),
})

/** Builds a mock AuthUser with the given role. */
const makeMockUser = (params: { readonly role: string }): AuthUser => ({
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  emailVerified: true,
  role: params.role,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
})

/** Builds a mock AuthSession. */
const makeMockSession = (): AuthSession => ({
  id: 'sess-1',
  expiresAt: new Date('2026-12-31'),
  token: 'test-token',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  userId: 'user-1',
})

/** Builds a base context with the given user and session. */
const makeContext = (params: {
  readonly user: AuthUser | null
  readonly session: AuthSession | null
}): {
  readonly db: DbClient
  readonly requestId: string
  readonly user: AuthUser | null
  readonly session: AuthSession | null
  readonly headers: Headers
} => ({
  db: {} as DbClient,
  requestId: 'test-req-1',
  user: params.user,
  session: params.session,
  headers: new Headers(),
})

describe('tRPC guard middleware', () => {
  describe('authedProcedure', () => {
    it('allows through with valid user and session', async () => {
      const caller = testRouter.createCaller(
        makeContext({
          user: makeMockUser({ role: 'user' }),
          session: makeMockSession(),
        }),
      )

      const result = await caller.authedOnly()
      expect(result).toBe('authed-ok')
    })

    it('throws UNAUTHORIZED with null user', async () => {
      const caller = testRouter.createCaller(
        makeContext({
          user: null,
          session: makeMockSession(),
        }),
      )

      await expect(caller.authedOnly()).rejects.toThrow(TRPCError)

      await expect(caller.authedOnly()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })

    it('throws UNAUTHORIZED with null session', async () => {
      const caller = testRouter.createCaller(
        makeContext({
          user: makeMockUser({ role: 'user' }),
          session: null,
        }),
      )

      await expect(caller.authedOnly()).rejects.toThrow(TRPCError)

      await expect(caller.authedOnly()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
    })
  })

  describe('adminProcedure', () => {
    it('allows through with role admin', async () => {
      const caller = testRouter.createCaller(
        makeContext({
          user: makeMockUser({ role: 'admin' }),
          session: makeMockSession(),
        }),
      )

      const result = await caller.adminOnly()
      expect(result).toBe('admin-ok')
    })

    it('throws FORBIDDEN with role user', async () => {
      const caller = testRouter.createCaller(
        makeContext({
          user: makeMockUser({ role: 'user' }),
          session: makeMockSession(),
        }),
      )

      await expect(caller.adminOnly()).rejects.toThrow(TRPCError)

      await expect(caller.adminOnly()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })

    it('throws FORBIDDEN with role dev', async () => {
      const caller = testRouter.createCaller(
        makeContext({
          user: makeMockUser({ role: 'dev' }),
          session: makeMockSession(),
        }),
      )

      await expect(caller.adminOnly()).rejects.toThrow(TRPCError)

      await expect(caller.adminOnly()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })
  })

  describe('devProcedure', () => {
    it('allows through with role dev', async () => {
      const caller = testRouter.createCaller(
        makeContext({
          user: makeMockUser({ role: 'dev' }),
          session: makeMockSession(),
        }),
      )

      const result = await caller.devOnly()
      expect(result).toBe('dev-ok')
    })

    it('allows through with role admin (superset)', async () => {
      const caller = testRouter.createCaller(
        makeContext({
          user: makeMockUser({ role: 'admin' }),
          session: makeMockSession(),
        }),
      )

      const result = await caller.devOnly()
      expect(result).toBe('dev-ok')
    })

    it('throws FORBIDDEN with role user', async () => {
      const caller = testRouter.createCaller(
        makeContext({
          user: makeMockUser({ role: 'user' }),
          session: makeMockSession(),
        }),
      )

      await expect(caller.devOnly()).rejects.toThrow(TRPCError)

      await expect(caller.devOnly()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
    })
  })
})
