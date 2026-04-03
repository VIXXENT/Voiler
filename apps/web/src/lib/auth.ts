import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

/**
 * Better Auth client configured for the API server.
 * Includes the admin plugin for impersonation support.
 */

const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  plugins: [adminClient()],
})

/** Valid application role values. */
const APP_ROLES = ['admin', 'dev', 'user'] as const

/** Union of valid application role strings. */
type AppRole = (typeof APP_ROLES)[number]

/**
 * Extracts the role from a session user object safely,
 * returning undefined if the value is absent or unrecognised.
 */
const sessionRole = (params: {
  readonly user: { readonly role?: unknown } | undefined
}): AppRole | undefined => {
  const { user } = params
  const raw: unknown = user?.role
  if (typeof raw !== 'string') {
    return undefined
  }
  return (APP_ROLES as readonly string[]).includes(raw) ? (raw as AppRole) : undefined
}

export { authClient, sessionRole }
export type { AppRole }
