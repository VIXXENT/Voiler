import { z } from 'zod'

/**
 * Zod schema for validating project creation input.
 * Used as the single source of truth for the create-project tRPC procedure.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const CreateProjectInputSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  description: z.string().max(500).optional(),
})

/**
 * TypeScript type for validated project creation input.
 * Inferred from {@link CreateProjectInputSchema}.
 */
type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>

export { CreateProjectInputSchema }
export type { CreateProjectInput }
