/**
 * @file schema.ts
 * @description Zod schemas for environment variable validation, scoped by runtime environment.
 * Each schema enforces the minimum required config for that context.
 *
 * Why separate schemas: production requires real DB URLs and Turso credentials;
 * test relaxes DATABASE_URL to allow in-memory SQLite; development uses the base.
 */

import { z } from 'zod';

/**
 * Base schema shared by all environments.
 * Covers the minimum required variables for the API to boot.
 */
export const BaseEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET must be at least 32 characters'),
  AUTH_URL: z.string().url('AUTH_URL must be a valid URL'),
});

/**
 * Production schema.
 * Extends base with stricter DATABASE_URL (must be a full URL) and
 * mandatory Turso credentials for the cloud SQLite instance.
 */
export const ProductionEnvSchema = BaseEnvSchema.extend({
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a URL in production'),
  TURSO_DATABASE_URL: z
    .string()
    .url('TURSO_DATABASE_URL required in production'),
  TURSO_AUTH_TOKEN: z
    .string()
    .min(1, 'TURSO_AUTH_TOKEN required in production'),
});

/**
 * Test schema.
 * Relaxes DATABASE_URL to allow in-memory SQLite for fast, isolated test runs.
 */
export const TestEnvSchema = BaseEnvSchema.extend({
  DATABASE_URL: z.string().default('file::memory:'),
});

/**
 * Union type covering all possible validated env shapes.
 * Used as the return type of loadEnv().
 */
export type BaseEnvConfig = z.infer<typeof BaseEnvSchema>;
export type ProductionEnvConfig = z.infer<typeof ProductionEnvSchema>;
export type TestEnvConfig = z.infer<typeof TestEnvSchema>;

/**
 * Union of all env schema types — used to annotate resolveSchema return.
 * Allows TypeScript to infer the correct z.infer<> without casting.
 */
export type AnyEnvSchema =
  | typeof BaseEnvSchema
  | typeof ProductionEnvSchema
  | typeof TestEnvSchema;

/**
 * The final typed config exported from loadEnv().
 * In development/test it matches BaseEnvConfig; in production, ProductionEnvConfig.
 */
export type EnvConfig = BaseEnvConfig | ProductionEnvConfig | TestEnvConfig;
