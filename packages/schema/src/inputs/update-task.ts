import { z } from 'zod'

/**
 * Zod schema for validating task update input.
 * Used as the single source of truth for the update-task tRPC procedure.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const UpdateTaskInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  title: z.string().min(1, 'Task title is required').max(200).optional(),
  description: z.string().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.date().nullable().optional(),
})

/**
 * TypeScript type for validated task update input.
 * Inferred from {@link UpdateTaskInputSchema}.
 */
type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>

export { UpdateTaskInputSchema }
export type { UpdateTaskInput }
