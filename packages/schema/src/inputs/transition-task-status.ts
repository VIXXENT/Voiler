import { z } from 'zod'

/**
 * Zod schema for validating task status transition input.
 * Used as the single source of truth for the transition-task-status tRPC procedure.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const TransitionTaskStatusInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  newStatus: z.enum(['todo', 'in_progress', 'done']),
})

/**
 * TypeScript type for validated task status transition input.
 * Inferred from {@link TransitionTaskStatusInputSchema}.
 */
type TransitionTaskStatusInput = z.infer<typeof TransitionTaskStatusInputSchema>

export { TransitionTaskStatusInputSchema }
export type { TransitionTaskStatusInput }
