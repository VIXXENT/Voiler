import { z } from 'zod'
import { PublicUserSchema } from './public-user.js'

/**
 * Output schema for the authentication response returned after a successful login.
 *
 * Why: Bundles the session token with a sanitized user object so clients receive
 * everything needed to bootstrap a session in a single response. Uses PublicUser
 * to ensure no sensitive data is included.
 *
 * @see {@link AuthResponse} for the inferred TypeScript type.
 */
export const AuthResponseSchema = z.object({
  token: z.string(),
  user: PublicUserSchema,
})

/** TypeScript type inferred from {@link AuthResponseSchema}. */
export type AuthResponse = z.infer<typeof AuthResponseSchema>
