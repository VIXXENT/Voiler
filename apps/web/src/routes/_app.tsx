import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AppLayout } from '~/components/layout'
import { authClient } from '~/lib/auth'

/** Pathless layout route for authenticated app pages. Redirects to login if no session. */
const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (!session.data) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/auth/login' })
    }
  },
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
})

export { Route }
