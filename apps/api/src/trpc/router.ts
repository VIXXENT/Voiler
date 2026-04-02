import { router } from './context.js'
import type { CreateAdminRouterParams } from './procedures/admin.js'
import { createAdminRouter } from './procedures/admin.js'
import type { CreateSessionRouterParams } from './procedures/session.js'
import { createSessionRouter } from './procedures/session.js'
import type { CreateUserRouterParams } from './procedures/user.js'
import { createUserRouter } from './procedures/user.js'

/**
 * Dependencies for the root tRPC router.
 */
interface CreateAppRouterParams {
  readonly user: CreateUserRouterParams
  readonly session: CreateSessionRouterParams
  readonly admin: CreateAdminRouterParams
}

/**
 * Create the root tRPC router that merges all
 * sub-routers into a single namespace.
 */
const createAppRouter: (params: CreateAppRouterParams) => ReturnType<typeof router> = (params) => {
  // eslint-disable-next-line @typescript-eslint/typedef
  const userRouter = createUserRouter(params.user)
  // eslint-disable-next-line @typescript-eslint/typedef
  const sessionRouter = createSessionRouter(params.session)
  // eslint-disable-next-line @typescript-eslint/typedef
  const adminRouter = createAdminRouter(params.admin)

  // eslint-disable-next-line @typescript-eslint/typedef
  const appRouter = router({
    user: userRouter,
    session: sessionRouter,
    admin: adminRouter,
  })

  return appRouter
}

/**
 * The root tRPC router type.
 * Exported for client-side type inference.
 */
type AppRouter = ReturnType<typeof createAppRouter>

export { createAppRouter }
export type { AppRouter, CreateAppRouterParams }
