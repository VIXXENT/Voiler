import { z } from 'zod'

import { PublicUserSchema } from './public-user.js'

/**
 * Zod schema for the authentication response payload.
 * Contains a JWT token and the authenticated user's public profile.
 * Used as the single source of truth for login/register responses.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const AuthResponseSchema = z.object({
  token: z.string(),
  user: PublicUserSchema,
})

/**
 * TypeScript type for the authentication response payload.
 * Inferred from {@link AuthResponseSchema}.
 */
type AuthResponse = z.infer<typeof AuthResponseSchema>

export { AuthResponseSchema }
export type { AuthResponse }
