import { z } from 'zod'

/**
 * Zod schema for public ProjectMember output.
 * Safely exposes project member information to clients.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const PublicProjectMemberSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  role: z.enum(['member', 'viewer']),
  joinedAt: z.date(),
})

/**
 * TypeScript type for public ProjectMember output.
 * Inferred from the Zod schema.
 */
type PublicProjectMember = z.infer<typeof PublicProjectMemberSchema>

export { PublicProjectMemberSchema }
export type { PublicProjectMember }
