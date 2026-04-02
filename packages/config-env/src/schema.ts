import { z } from 'zod'

/**
 * Minimum length for AUTH_SECRET to ensure cryptographic security.
 * 32 characters provides at least 192 bits of entropy with base64.
 */
const AUTH_SECRET_MIN_LENGTH: number = 32

/**
 * Zod schema for environment variable validation.
 * Validates all required env vars at startup — fail-fast on misconfiguration.
 *
 * @remarks
 * AUTH_SECRET must be at least 32 characters for session signing security.
 * DATABASE_URL must be a valid PostgreSQL connection string.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .startsWith('postgresql://', 'DATABASE_URL must be a PostgreSQL connection string'),
  AUTH_SECRET: z
    .string()
    .min(
      AUTH_SECRET_MIN_LENGTH,
      `AUTH_SECRET must be at least ${String(AUTH_SECRET_MIN_LENGTH)} characters`,
    ),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
})

type EnvSchema = typeof envSchema

/**
 * Validated environment configuration type.
 * Inferred from the Zod env schema — single source of truth.
 */
type EnvConfig = z.infer<EnvSchema>

export { envSchema }
export type { EnvConfig }
