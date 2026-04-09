import { z } from 'zod'

/**
 * Zod schema for the invite-to-project input.
 * Validates the data required to invite a user to a project.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const InviteToProjectInputSchema = z.object({
  projectId: z.string().min(1),
  targetUserId: z.string().min(1),
  role: z.enum(['member', 'viewer']),
})

/**
 * TypeScript type for the invite-to-project input.
 * Inferred from the Zod schema.
 */
type InviteToProjectInput = z.infer<typeof InviteToProjectInputSchema>

export { InviteToProjectInputSchema }
export type { InviteToProjectInput }
