import { z } from 'zod'

/**
 * Zod schema for validating user registration input.
 * Used as the single source of truth for the create-user tRPC procedure.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const CreateUserInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
})

/**
 * TypeScript type for validated user registration input.
 * Inferred from {@link CreateUserInputSchema}.
 */
type CreateUserInput = z.infer<typeof CreateUserInputSchema>

export { CreateUserInputSchema }
export type { CreateUserInput }
