import { z } from 'zod'

/**
 * Input schema for updating an existing user.
 *
 * Why: Requires an id to identify the target record. All profile fields are
 * optional to support partial updates (PATCH semantics). Password change
 * enforces the same minimum length as creation.
 *
 * @see {@link UpdateUserInput} for the inferred TypeScript type.
 */
export const UpdateUserInputSchema = z.object({
  id: z.number().int().positive('User id must be a positive integer'),
  name: z.string().min(3, 'Name must be at least 3 characters').optional(),
  email: z.string().email('Invalid email').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
})

/** TypeScript type inferred from {@link UpdateUserInputSchema}. */
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>
