import { router } from './context.js'
import type { CreateAdminRouterParams } from './procedures/admin.js'
import { createAdminRouter } from './procedures/admin.js'
import type { CreateSessionRouterParams } from './procedures/session.js'
import { createSessionRouter } from './procedures/session.js'
import type { CreateUserRouterParams } from './procedures/user.js'
import { createUserRouter } from './procedures/user.js'
// [MODULE:payments] import type { CreatePaymentRouterParams } from './procedures/payments.js'
// [MODULE:payments] import { createPaymentRouter } from './procedures/payments.js'
// [MODULE:email] import type { CreateEmailRouterParams } from './procedures/email.js'
// [MODULE:email] import { createEmailRouter } from './procedures/email.js'

/**
 * Dependencies for the root tRPC router.
 */
interface CreateAppRouterParams {
  readonly user: CreateUserRouterParams
  readonly session: CreateSessionRouterParams
  readonly admin: CreateAdminRouterParams
  // [MODULE:payments] readonly payment: CreatePaymentRouterParams
  // [MODULE:email] readonly email: CreateEmailRouterParams
}

/**
 * Create the root tRPC router that merges all
 * sub-routers into a single namespace.
 */
const createAppRouter: (params: CreateAppRouterParams) => ReturnType<typeof router> = (params) => {
  const userRouter = createUserRouter(params.user)

  const sessionRouter = createSessionRouter(params.session)

  const adminRouter = createAdminRouter(params.admin)

  // [MODULE:payments] const paymentRouter = createPaymentRouter(params.payment)
  // [MODULE:email] const emailRouter = createEmailRouter(params.email)

  const appRouter = router({
    user: userRouter,
    session: sessionRouter,
    admin: adminRouter,
    // [MODULE:payments] payment: paymentRouter,
    // [MODULE:email] email: emailRouter,
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
