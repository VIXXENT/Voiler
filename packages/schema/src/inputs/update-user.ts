import { z } from 'zod'

/**
 * Zod schema for validating partial user update input.
 * All fields are optional — only provided fields are updated.
 * Used as the single source of truth for the update-user tRPC procedure.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const UpdateUserInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.string().min(1).optional(),
})

/**
 * TypeScript type for validated partial user update input.
 * Inferred from {@link UpdateUserInputSchema}.
 */
type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>

export { UpdateUserInputSchema }
export type { UpdateUserInput }
