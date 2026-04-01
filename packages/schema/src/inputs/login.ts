import { z } from 'zod'

/**
 * Zod schema for validating login input.
 * Used as the single source of truth for the login tRPC procedure.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const LoginInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

/**
 * TypeScript type for validated login input.
 * Inferred from {@link LoginInputSchema}.
 */
type LoginInput = z.infer<typeof LoginInputSchema>

export { LoginInputSchema }
export type { LoginInput }
