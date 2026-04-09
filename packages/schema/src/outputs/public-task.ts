import { z } from 'zod'

/**
 * Zod schema for a safe public task representation.
 * Used as the single source of truth for task data sent to clients.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const PublicTaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['todo', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  dueDate: z.date().nullable(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

/**
 * TypeScript type for a safe public task representation.
 * Inferred from {@link PublicTaskSchema}.
 */
type PublicTask = z.infer<typeof PublicTaskSchema>

export { PublicTaskSchema }
export type { PublicTask }
