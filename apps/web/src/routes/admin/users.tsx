import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'

import { authClient } from '~/lib/auth'
import { trpc } from '~/lib/trpc'

/** Shape of a user row from the API. */
interface AdminUserRow {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly role: string
}

/** Admin user list page with impersonation support. */
const AdminUsersPage = () => {
  // eslint-disable-next-line @typescript-eslint/typedef
  const session = authClient.useSession()

  const [impersonating, setImpersonating] = useState<string | null>(null)

  /* eslint-disable
      @typescript-eslint/no-unsafe-assignment,
      @typescript-eslint/no-unsafe-call,
      @typescript-eslint/no-unsafe-member-access */
  const { data, isLoading, error } =
    // @ts-expect-error — cross-package tRPC collision
    trpc.user.list.useQuery()
  /* eslint-enable
      @typescript-eslint/no-unsafe-assignment,
      @typescript-eslint/no-unsafe-call,
      @typescript-eslint/no-unsafe-member-access */

  const users: AdminUserRow[] | undefined = data as AdminUserRow[] | undefined

  const errorMessage: string | undefined =
    error !== null && error !== undefined ? (error as { message: string }).message : undefined

  const currentUserId: string | undefined = session.data?.user.id

  /** Start impersonating a user by ID. */
  const handleImpersonate: (params: { userId: string }) => Promise<void> = async (params) => {
    setImpersonating(params.userId)
    await authClient.admin.impersonateUser({
      userId: params.userId,
    })
    window.location.href = '/dashboard'
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Admin: Users</h1>
        <p className="text-sm text-gray-500">Loading users...</p>
      </div>
    )
  }

  if (errorMessage !== undefined) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Admin: Users</h1>
        <p className="text-sm text-red-600">Failed to load users: {errorMessage}</p>
      </div>
    )
  }

  if (users === undefined || users.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Admin: Users</h1>
        <p className="text-sm text-gray-500">No users found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin: Users</h1>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Role
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users.map((user: AdminUserRow) => (
              <tr key={user.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {user.name}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{user.email}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold leading-5 text-blue-800">
                    {user.role}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  {user.id !== currentUserId && (
                    <button
                      type="button"
                      disabled={impersonating !== null}
                      onClick={() =>
                        void handleImpersonate({
                          userId: user.id,
                        })
                      }
                      className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      {impersonating === user.id ? 'Impersonating...' : 'Impersonate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/typedef
const Route = createFileRoute('/admin/users')({
  beforeLoad: async () => {
    // eslint-disable-next-line @typescript-eslint/typedef
    const session = await authClient.getSession()
    if (!session.data) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/auth/login' })
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (session.data.user?.role !== 'admin') {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AdminUsersPage,
})

export { Route }
