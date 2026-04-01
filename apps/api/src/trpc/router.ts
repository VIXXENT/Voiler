import { router } from './context.js'
import type { CreateAuthRouterParams } from './procedures/auth.js'
import { createAuthRouter } from './procedures/auth.js'
import type { CreateUserRouterParams } from './procedures/user.js'
import { createUserRouter } from './procedures/user.js'

/**
 * Dependencies for the root tRPC router.
 */
interface CreateAppRouterParams {
  readonly user: CreateUserRouterParams
  readonly auth: CreateAuthRouterParams
}

/**
 * Create the root tRPC router that merges all
 * sub-routers into a single namespace.
 */
const createAppRouter: (params: CreateAppRouterParams) => ReturnType<typeof router> = (params) => {
  // eslint-disable-next-line @typescript-eslint/typedef
  const userRouter = createUserRouter(params.user)
  // eslint-disable-next-line @typescript-eslint/typedef
  const authRouter = createAuthRouter(params.auth)

  // eslint-disable-next-line @typescript-eslint/typedef
  const appRouter = router({
    user: userRouter,
    auth: authRouter,
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
