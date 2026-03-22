import { z } from 'zod'

/**
 * SOURCE OF TRUTH: User schema for the entire monorepo.
 * Any change here will be detected by Drizzle and React.
 */
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

// Inferred types for the rest of the system
export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof UserSchema>;
