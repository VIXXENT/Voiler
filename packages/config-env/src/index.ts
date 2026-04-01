/**
 * @module @gemtest/config-env
 *
 * Zod-validated environment configuration with fail-fast behavior.
 * Validates all required env vars at startup — if any are missing
 * or malformed, the process exits immediately with a clear error.
 *
 * @example
 * ```ts
 * import { loadEnv } from '@gemtest/config-env'
 * const env = loadEnv()
 * console.log(env.PORT) // 4000
 * ```
 */
export { loadEnv } from './load-env.js'
export { envSchema } from './schema.js'
export type { EnvConfig } from './schema.js'
