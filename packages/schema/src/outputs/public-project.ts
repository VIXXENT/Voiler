import { z } from 'zod'

/**
 * Zod schema for a safe public project representation.
 * Used as the single source of truth for project data sent to clients.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const PublicProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string(),
  status: z.enum(['active', 'archived']),
  frozen: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * TypeScript type for a safe public project representation.
 * Inferred from {@link PublicProjectSchema}.
 */
type PublicProject = z.infer<typeof PublicProjectSchema>

export { PublicProjectSchema }
export type { PublicProject }
