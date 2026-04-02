import type { ReactNode } from 'react'

import { authClient } from '~/lib/auth'

/** Valid application roles. */
type AppRole = 'admin' | 'dev' | 'user'

/** Props for the RoleGate component. */
interface RoleGateProps {
  readonly role: AppRole
  readonly children: ReactNode
  readonly fallback?: ReactNode
}

/**
 * Conditionally render children based on the current
 * user's role. Admin is a superset of all other roles.
 *
 * - `admin` sees everything.
 * - `dev` sees dev + user content.
 * - `user` sees only user content.
 */
const RoleGate = (props: RoleGateProps) => {
  const { role, children, fallback } = props
  // eslint-disable-next-line @typescript-eslint/typedef
  const session = authClient.useSession()

  if (session.isPending) {
    return fallback !== undefined ? <>{fallback}</> : null
  }

  const userRole: string | undefined =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    session.data?.user?.role as string | undefined

  const hasAccess: boolean = (() => {
    if (userRole === 'admin') {
      return true
    }
    if (role === 'dev') {
      return userRole === 'dev' || userRole === 'admin'
    }
    if (role === 'user') {
      return userRole !== undefined
    }
    return userRole === role
  })()

  if (hasAccess) {
    return <>{children}</>
  }

  return fallback !== undefined ? <>{fallback}</> : null
}

export { RoleGate }
export type { AppRole, RoleGateProps }
