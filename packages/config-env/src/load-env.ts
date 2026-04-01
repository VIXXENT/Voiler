import { config } from 'dotenv'
import { z } from 'zod'

import type { EnvConfig } from './schema.js'
import { envSchema } from './schema.js'

/**
 * Load and validate environment variables with fail-fast behavior.
 * Reads from `.env` file and validates against the Zod schema.
 *
 * @returns Validated and typed environment configuration.
 * @throws Exits process with code 1 if validation fails — this is
 *   intentional infrastructure-level failure, not business logic.
 */
const loadEnv = (): EnvConfig => {
  config()

  const result: z.SafeParseReturnType<unknown, EnvConfig> =
    envSchema.safeParse(process.env)

  if (result.success) {
    return result.data
  }

  const formattedErrors: string = result.error.issues
    .map((issue: z.ZodIssue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')

  console.error('[config-env] Environment validation failed:\n' + formattedErrors)
  process.exit(1)
}

export { loadEnv }
