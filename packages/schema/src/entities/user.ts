import { z } from 'zod'

/**
 * SOURCE OF TRUTH: User schema for the entire monorepo.
 *
 * Why: Single canonical definition shared by Drizzle (DB columns via zodToSqliteTable),
 * React (form validation), and GraphQL resolvers. Any change here propagates automatically.
 *
 * @see {@link User} for the inferred TypeScript type.
 */
// eslint-disable-next-line @typescript-eslint/typedef
export const UserSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(3, 'Name must be at least 3 characters').optional(),
  email: z.string().email('Invalid email'),
  emailVerified: z.date().optional(),
  image: z.string().url('Invalid image URL').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  twoFactorSecret: z.string().optional(),
  loginAttempts: z.number().int().default(0),
  lockUntil: z.date().optional(),
  role: z.string().default('user'),
  createdAt: z.date().optional(),
})

/** TypeScript type inferred from {@link UserSchema}. */
export type User = z.infer<typeof UserSchema>
