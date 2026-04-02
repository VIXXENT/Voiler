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

export { authClient }
