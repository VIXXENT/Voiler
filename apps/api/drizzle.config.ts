import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

/**
 * Drizzle Kit configuration for migration generation and DB push.
 *
 * @remarks
 * Uses DATABASE_URL from environment.
 * Schema is read from the db/schema.ts barrel file.
 */
export default defineConfig({
  schema: '../../packages/schema/src/entities/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    url: process.env['DATABASE_URL']!,
  },
})
