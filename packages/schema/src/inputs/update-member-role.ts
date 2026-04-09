import { z } from 'zod'

/**
 * Zod schema for the update-member-role input.
 * Validates the data required to update a project member's role.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const UpdateMemberRoleInputSchema = z.object({
  projectId: z.string().min(1),
  targetUserId: z.string().min(1),
  newRole: z.enum(['member', 'viewer']),
})

/**
 * TypeScript type for the update-member-role input.
 * Inferred from the Zod schema.
 */
type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleInputSchema>

export { UpdateMemberRoleInputSchema }
export type { UpdateMemberRoleInput }
