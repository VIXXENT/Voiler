import { z } from 'zod'

/**
 * Zod schema for a safe public user representation.
 * Excludes sensitive fields like password hashes.
 * Used as the single source of truth for user data sent to clients.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const PublicUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  createdAt: z.date(),
})

/**
 * TypeScript type for a safe public user representation.
 * Inferred from {@link PublicUserSchema}.
 */
type PublicUser = z.infer<typeof PublicUserSchema>

export { PublicUserSchema }
export type { PublicUser }
