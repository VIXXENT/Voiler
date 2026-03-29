/**
 * @file load-env.ts
 * @description Validates process.env against the appropriate Zod schema for the
 * current NODE_ENV. Fails fast on startup if any required variable is missing
 * or malformed — the app must not boot with invalid configuration.
 *
 * Why throw here: this is the one acceptable use of throw in the codebase.
 * An invalid environment is an unrecoverable startup error, not a business error.
 * The calling process should crash immediately with a clear diagnostic message.
 */

import {
  BaseEnvSchema,
  ProductionEnvSchema,
  TestEnvSchema,
  type AnyEnvSchema,
  type EnvConfig,
} from './schema.js';

/**
 * Selects the Zod schema matching the current NODE_ENV.
 *
 * @param nodeEnv - Raw NODE_ENV string from process.env (may be undefined)
 * @returns The appropriate Zod schema for validation
 */
const resolveSchema = (nodeEnv: string | undefined): AnyEnvSchema => {
  if (nodeEnv === 'production') return ProductionEnvSchema;
  if (nodeEnv === 'test') return TestEnvSchema;
  return BaseEnvSchema;
};

/**
 * Formats a ZodError into a human-readable list of field errors.
 *
 * @param issues - Array of Zod validation issues
 * @returns A multi-line string listing each invalid field and its message
 */
const formatZodIssues = (
  issues: Array<{ path: Array<string | number>; message: string }>
): string =>
  issues
    .map(({ path, message }) => `  - ${path.join('.') || 'root'}: ${message}`)
    .join('\n');

/**
 * Validates process.env against the schema for the current NODE_ENV.
 * Throws immediately (fail-fast) if validation fails.
 *
 * @returns Typed and validated environment configuration
 * @throws Error if any required environment variable is missing or invalid
 *
 * @example
 * ```ts
 * import { loadEnv } from '@gemtest/config-env';
 *
 * const config = loadEnv();
 * console.log(config.PORT); // 4000
 * ```
 */
export const loadEnv = (): EnvConfig => {
  const rawNodeEnv = process.env['NODE_ENV'];
  const schema = resolveSchema(rawNodeEnv);

  const result = schema.safeParse(process.env);

  if (!result.success) {
    const formatted = formatZodIssues(result.error.issues);
    throw new Error(
      `[config-env] Invalid environment variables:\n${formatted}\n` +
        `NODE_ENV was: ${rawNodeEnv ?? '(not set)'}`
    );
  }

  return result.data;
};
