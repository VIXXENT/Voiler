import { z } from 'zod'

/**
 * Zod schema for validating task creation input.
 * Used as the single source of truth for the create-task tRPC procedure.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const CreateTaskInputSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  dueDate: z.date().optional(),
})

/**
 * TypeScript type for validated task creation input.
 * Inferred from {@link CreateTaskInputSchema}.
 */
type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>

export { CreateTaskInputSchema }
export type { CreateTaskInput }
