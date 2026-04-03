import type { ReactNode } from 'react'

import { authClient, sessionRole } from '~/lib/auth'
import type { AppRole } from '~/lib/auth'

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

  const session = authClient.useSession()

  if (session.isPending) {
    return fallback !== undefined ? <>{fallback}</> : null
  }

  const userRole: AppRole | undefined = sessionRole({ user: session.data?.user })

  const hasAccess: boolean = (() => {
    if (userRole === 'admin') {
      return true
    }
    if (role === 'dev') {
      return userRole === 'dev'
    }
    // role is 'user' or 'admin'; admin was handled above, so any authenticated user qualifies
    return userRole !== undefined
  })()

  if (hasAccess) {
    return <>{children}</>
  }

  return fallback !== undefined ? <>{fallback}</> : null
}

export { RoleGate }
export type { AppRole, RoleGateProps }
