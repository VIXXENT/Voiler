import { z } from 'zod'

/**
 * Input schema for user authentication (login).
 *
 * Why: Captures the minimal credentials required to identify and authenticate
 * a user. No password minimum enforced here — validation against stored hash
 * is handled by the auth service.
 *
 * @see {@link LoginInput} for the inferred TypeScript type.
 */
export const LoginInputSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

/** TypeScript type inferred from {@link LoginInputSchema}. */
export type LoginInput = z.infer<typeof LoginInputSchema>
