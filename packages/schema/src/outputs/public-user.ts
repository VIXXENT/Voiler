import { z } from 'zod'
import { UserSchema } from '../entities/user.js'

/**
 * Output schema for a user safe to expose via API responses.
 *
 * Why: Strips sensitive fields (password, twoFactorSecret, loginAttempts,
 * lockUntil) from the domain entity so they never leak to API consumers.
 * Derived from UserSchema to stay in sync with domain changes automatically.
 *
 * @see {@link PublicUser} for the inferred TypeScript type.
 */
export const PublicUserSchema = UserSchema.pick({
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
})

/** TypeScript type inferred from {@link PublicUserSchema}. */
export type PublicUser = z.infer<typeof PublicUserSchema>
