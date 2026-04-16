import { createFileRoute, redirect } from '@tanstack/react-router'

import { RoleGate } from '~/components/RoleGate'
import { UserList } from '~/components/UserList'
import { authClient } from '~/lib/auth'

/** Authenticated dashboard showing the current user and user list. */
const DashboardPage = () => {
  const session = authClient.useSession()

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const userName: string = session.data?.user?.name ?? 'User'
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const userEmail: string = session.data?.user?.email ?? ''

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back, {userName}
          {userEmail !== '' ? ` (${userEmail})` : ''}
        </p>
      </div>

      <RoleGate role="admin">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Users</h2>
          <UserList />
        </section>
      </RoleGate>
    </div>
  )
}

const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await authClient.getSession()
    if (!session.data) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/auth/login' })
    }
  },
  component: DashboardPage,
})

export { Route }
