import { trpc } from '~/lib/trpc'

/** Shape of a public user returned by the API. */
interface UserRow {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly role: string
}

/** Returns true if value is a UserRow. */
const isUserRow = (value: unknown): value is UserRow =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'name' in value &&
  'email' in value &&
  'role' in value &&
  typeof (value as UserRow).id === 'string' &&
  typeof (value as UserRow).name === 'string' &&
  typeof (value as UserRow).email === 'string' &&
  typeof (value as UserRow).role === 'string'

/** Returns true if value is a UserRow array. */
const isUserRowArray = (value: unknown): value is UserRow[] =>
  Array.isArray(value) && value.every(isUserRow)

/** Extracts a message string from an unknown error value. */
const extractMessage = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined
  }
  if (typeof value === 'object' && 'message' in value) {
    const msg: unknown = (value as { message: unknown }).message
    if (typeof msg === 'string') {
      return msg
    }
  }
  if (typeof value === 'string') {
    return value
  }
  return undefined
}

// TODO: i18n — replace hardcoded strings with t() calls
/** Displays a table of users fetched via tRPC. */
const UserList = () => {
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

  const users: UserRow[] | undefined = isUserRowArray(data) ? data : undefined

  const errorMessage: string | undefined = extractMessage(error)

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading users...</p>
  }

  if (errorMessage !== undefined) {
    return <p className="text-sm text-red-600">Failed to load users: {errorMessage}</p>
  }

  if (users === undefined || users.length === 0) {
    return <p className="text-sm text-gray-500">No users found.</p>
  }

  return (
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
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {users.map((user: UserRow) => (
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { UserList }
export type { UserRow }
