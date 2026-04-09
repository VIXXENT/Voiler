import { z } from 'zod'

/**
 * Zod schema for validating task assignment input.
 * Used as the single source of truth for the assign-task tRPC procedure.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const AssignTaskInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  targetUserId: z.string().min(1, 'Target user ID is required'),
  role: z.enum(['responsible', 'reviewer', 'collaborator']),
})

/**
 * Zod schema for validating task unassignment input.
 * Used as the single source of truth for the unassign-task tRPC procedure.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const UnassignTaskInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  targetUserId: z.string().min(1, 'Target user ID is required'),
})

/**
 * TypeScript type for validated task assignment input.
 * Inferred from {@link AssignTaskInputSchema}.
 */
type AssignTaskInput = z.infer<typeof AssignTaskInputSchema>

/**
 * TypeScript type for validated task unassignment input.
 * Inferred from {@link UnassignTaskInputSchema}.
 */
type UnassignTaskInput = z.infer<typeof UnassignTaskInputSchema>

export { AssignTaskInputSchema, UnassignTaskInputSchema }
export type { AssignTaskInput, UnassignTaskInput }
