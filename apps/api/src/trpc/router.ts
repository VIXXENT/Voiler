import { router } from './context.js'
import type { CreateAdminRouterParams } from './procedures/admin.js'
import { createAdminRouter } from './procedures/admin.js'
import type { CreateMemberRouterParams } from './procedures/member.js'
import { createMemberRouter } from './procedures/member.js'
import type { CreatePaymentRouterParams } from './procedures/payments.js'
import { createPaymentRouter } from './procedures/payments.js'
import type { CreateProjectRouterParams } from './procedures/project.js'
import { createProjectRouter } from './procedures/project.js'
import type { CreateSessionRouterParams } from './procedures/session.js'
import { createSessionRouter } from './procedures/session.js'
import type { CreateTaskRouterParams } from './procedures/task.js'
import { createTaskRouter } from './procedures/task.js'
import type { CreateUserRouterParams } from './procedures/user.js'
import { createUserRouter } from './procedures/user.js'

/**
 * Dependencies for the root tRPC router.
 */
interface CreateAppRouterParams {
  readonly user: CreateUserRouterParams
  readonly session: CreateSessionRouterParams
  readonly admin: CreateAdminRouterParams
  readonly payment: CreatePaymentRouterParams
  readonly project: CreateProjectRouterParams
  readonly task: CreateTaskRouterParams
  readonly member: CreateMemberRouterParams
}

/**
 * Create the root tRPC router that merges all
 * sub-routers into a single namespace.
 */
const createAppRouter: (params: CreateAppRouterParams) => ReturnType<typeof router> = (params) => {
  const userRouter = createUserRouter(params.user)

  const sessionRouter = createSessionRouter(params.session)

  const adminRouter = createAdminRouter(params.admin)

  const paymentRouter = createPaymentRouter(params.payment)

  const projectRouter = createProjectRouter(params.project)

  const taskRouter = createTaskRouter(params.task)

  const memberRouter = createMemberRouter(params.member)

  const appRouter = router({
    user: userRouter,
    session: sessionRouter,
    admin: adminRouter,
    payment: paymentRouter,
    project: projectRouter,
    task: taskRouter,
    member: memberRouter,
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
