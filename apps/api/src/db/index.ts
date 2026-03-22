import { createClient, type Client } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { ResultAsync, fromPromise } from 'neverthrow'
import * as schema from './schema.js'

const client: Client = createClient({
  url: 'file:local.db',
})

/**
 * Instancia de la base de datos tipada dinámicamente según el esquema.
 */
export const db: LibSQLDatabase<typeof schema> = drizzle(client, { schema })

type InitDB = () => ResultAsync<void, Error>

/**
 * Executes database migrations to synchronize the schema.
 *
 * This function ensures that the local SQLite database is up-to-date with the
 * current Drizzle schema definitions. It uses 'neverthrow' to capture any
 * migration failures as a ResultAsync.
 *
 * @returns A ResultAsync indicating success (void) or a migration Error.
 */
const initDB: InitDB = (): ResultAsync<void, Error> => {
  return fromPromise(
    migrate(db, { migrationsFolder: './drizzle' }),
    (err: unknown): Error => (err instanceof Error ? err : new Error(String(err))),
  )
}

/**
 * Immediate execution of the migration workflow.
 * The floating promise is explicitly handled using 'void' and '.match()'
 * to provide feedback in the console.
 */
void initDB().match(
  (): void => {
    console.info('✅ Base de datos migrada correctamente')
  },
  (err: Error): void => {
    console.error('❌ Error migrando DB:', err.message)
  },
)
