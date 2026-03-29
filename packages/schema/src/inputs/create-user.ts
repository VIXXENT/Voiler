import { z } from 'zod'

/**
 * Input schema for creating a new user.
 *
 * Why: Defines required fields for user registration. Intentionally independent
 * from UserSchema — creation requires name and password which are optional in
 * the domain entity. Server-generated fields (id, role, createdAt) are excluded.
 *
 * @see {@link CreateUserInput} for the inferred TypeScript type.
 */
export const CreateUserInputSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

/** TypeScript type inferred from {@link CreateUserInputSchema}. */
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>
