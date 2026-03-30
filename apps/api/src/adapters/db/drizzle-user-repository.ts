import { eq } from 'drizzle-orm'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { fromPromise } from 'neverthrow'
import type { ResultAsync } from 'neverthrow'
import type { IUserRepository, CreateUserInput, UserWithPassword } from '@gemtest/core'
import { infrastructureError } from '@gemtest/core'
import type { AppError } from '@gemtest/core'
import type { UserEntity, Email, UserId } from '@gemtest/domain'
import { createUserId } from '@gemtest/domain'
import { users } from '../../db/schema.js'
import type * as schema from '../../db/schema.js'

// ---------------------------------------------------------------------------
// Type bridge note
// ---------------------------------------------------------------------------
// Drizzle's `zodToSqliteTable` returns dynamically-typed tables (`ReturnType<typeof sqliteTable>`)
// which lose column-level type information. The `as UserRow[]` and `as string` casts below
// are structural bridges at the ORM boundary — they are safe because the runtime values
// match the asserted types (verified by the Zod schema that defines the table).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/**
 * Raw DB row shape inferred from the Drizzle schema.
 * The table is typed as ReturnType<typeof sqliteTable>, so we use a structural
 * approximation that matches the actual SQLite columns.
 */
type UserRow = {
  readonly id: number | string
  readonly email: string
  readonly name: string | null
  readonly role: string | null
  readonly createdAt: string | number | Date | null
  readonly password: string | null
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Converts a numeric or string DB id to the branded UserId string.
 *
 * Why: The SQLite table uses integer auto-increment IDs, but the domain
 * model uses branded string UserId values. This bridge function is the
 * single place where that conversion happens.
 *
 * @param id - The raw database id value.
 * @returns A branded UserId string.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const toUserId = (id: number | string): UserId => createUserId(String(id))

/**
 * Converts a branded UserId string back to a numeric database id.
 *
 * @param userId - The branded UserId to convert.
 * @returns The numeric id for use in DB queries.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const fromUserId = (userId: string): number => parseInt(userId, 10)

/**
 * Maps a raw database row to a `UserEntity`.
 *
 * Why: Isolating the mapping here keeps the repository methods clean and
 * ensures all null-coalescing and type conversions happen in one place.
 *
 * @param row - The raw row returned by Drizzle.
 * @returns A fully-formed `UserEntity`.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const rowToEntity = (row: UserRow): UserEntity => ({
  id: toUserId(row.id as number | string),
  email: row.email as Email,
  name: row.name ?? '',
  role: row.role ?? 'user',
  createdAt: row.createdAt instanceof Date
    ? row.createdAt
    : new Date(row.createdAt ?? Date.now()),
})

/**
 * Maps a raw database row to a `UserWithPassword`.
 *
 * @param row - The raw row returned by Drizzle.
 * @returns A `UserWithPassword` (entity + passwordHash).
 */
// eslint-disable-next-line @typescript-eslint/typedef
const rowToUserWithPassword = (row: UserRow): UserWithPassword => ({
  ...rowToEntity(row),
  passwordHash: row.password ?? '',
})

/**
 * Wraps an unknown caught value into an `AppError` for infrastructure failures.
 *
 * @param cause - The original error.
 * @returns An `AppError` tagged as `InfrastructureError`.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const toInfraError = (cause: unknown): AppError =>
  infrastructureError({ message: 'Database operation failed', cause })

// ---------------------------------------------------------------------------
// Factory deps type
// ---------------------------------------------------------------------------

/** Dependencies required by the Drizzle user repository. */
type DrizzleUserRepositoryDeps = {
  readonly db: LibSQLDatabase<typeof schema>
}

// ---------------------------------------------------------------------------
// Async helpers (use async/await to satisfy no-restricted-syntax rule)
// ---------------------------------------------------------------------------

/**
 * Extracts the first row from an insert-returning result or throws.
 *
 * Why throw here: This helper runs inside a `fromPromise()` wrapper, which
 * catches the thrown error and converts it to `Err(AppError)`. This is the
 * idiomatic neverthrow pattern for adapting imperative DB code to Result types.
 */
const firstOrThrow: (rows: UserRow[]) => UserRow = (rows) => {
  const row: UserRow | undefined = rows[0]
  if (row === undefined) {
    throw new Error('Insert returned no rows')
  }
  return row
}

/** Parameters for {@link firstOrThrowUpdate}. */
type FirstOrThrowUpdateParams = {
  readonly id: string
  readonly rows: UserRow[]
}

/** Extracts the first row from an update-returning result or throws. */
const firstOrThrowUpdate: (params: FirstOrThrowUpdateParams) => UserRow = (params) => {
  const { id, rows } = params
  const row: UserRow | undefined = rows[0]
  if (row === undefined) {
    throw new Error(`User with id ${id} not found`)
  }
  return row
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * Creates a `IUserRepository` backed by Drizzle ORM + LibSQL (SQLite).
 *
 * Why: A factory function keeps instantiation explicit and makes the adapter
 * easy to test by injecting a mock `db` instance.
 *
 * @param deps - The `db` instance from Drizzle.
 * @returns An object implementing `IUserRepository`.
 */
export const createDrizzleUserRepository: (
  deps: DrizzleUserRepositoryDeps,
) => IUserRepository = (deps) => {
  const { db } = deps

  return {
    /**
     * Persists a new user record and returns the created entity.
     *
     * @param data - The input data for the new user.
     * @returns `ResultAsync` with the created `UserEntity` or an `AppError`.
     */
    create: (data: CreateUserInput): ResultAsync<UserEntity, AppError> => {
      const { email, name, passwordHash, role } = data
      return fromPromise(
        (async (): Promise<UserEntity> => {
          const rows: UserRow[] = await db
            .insert(users)
            .values({
              email: email as string,
              name,
              password: passwordHash,
              image: '',
              role: role ?? 'user',
              createdAt: new Date(),
            })
            .returning() as UserRow[]
          return rowToEntity(firstOrThrow(rows))
        })(),
        toInfraError,
      )
    },

    /**
     * Returns all users in the database.
     *
     * @returns `ResultAsync` with an array of `UserEntity` or an `AppError`.
     */
    findAll: (): ResultAsync<UserEntity[], AppError> =>
      fromPromise(
        (async (): Promise<UserEntity[]> => {
          const rows: UserRow[] = await db.select().from(users) as UserRow[]
          return rows.map(rowToEntity)
        })(),
        toInfraError,
      ),

    /**
     * Finds a user by their string UserId (converted to integer for the DB).
     *
     * @param id - The branded UserId string.
     * @returns `ResultAsync` with the entity or null, or an `AppError`.
     */
    findById: (id: string): ResultAsync<UserEntity | null, AppError> =>
      fromPromise(
        (async (): Promise<UserEntity | null> => {
          const rows: UserRow[] = await db
            .select()
            .from(users)
            .where(eq(users.id, fromUserId(id))) as UserRow[]
          const row: UserRow | undefined = rows[0]
          return row !== undefined ? rowToEntity(row) : null
        })(),
        toInfraError,
      ),

    /**
     * Applies a partial update to an existing user.
     *
     * @param params - Object with `id` and partial `data` to merge.
     * @returns `ResultAsync` with the updated `UserEntity` or an `AppError`.
     */
    update: (
      params: { readonly id: string; readonly data: Partial<UserEntity> },
    ): ResultAsync<UserEntity, AppError> => {
      const { id, data } = params
      return fromPromise(
        (async (): Promise<UserEntity> => {
          const rows: UserRow[] = await db
            .update(users)
            .set(data as Record<string, unknown>)
            .where(eq(users.id, fromUserId(id)))
            .returning() as UserRow[]
          return rowToEntity(firstOrThrowUpdate({ id, rows }))
        })(),
        toInfraError,
      )
    },

    /**
     * Deletes a user by id.
     *
     * @param id - The branded UserId string.
     * @returns `ResultAsync` with `true` if deleted, `false` if not found,
     *          or an `AppError`.
     */
    delete: (id: string): ResultAsync<boolean, AppError> =>
      fromPromise(
        (async (): Promise<boolean> => {
          const rows: UserRow[] = await db
            .delete(users)
            .where(eq(users.id, fromUserId(id)))
            .returning() as UserRow[]
          return rows.length > 0
        })(),
        toInfraError,
      ),

    /**
     * Looks up a user by email address.
     *
     * @param email - The validated, branded email to search for.
     * @returns `ResultAsync` with the entity or null, or an `AppError`.
     */
    findByEmail: (email: Email): ResultAsync<UserEntity | null, AppError> =>
      fromPromise(
        (async (): Promise<UserEntity | null> => {
          const rows: UserRow[] = await db
            .select()
            .from(users)
            .where(eq(users.email, email as string)) as UserRow[]
          const row: UserRow | undefined = rows[0]
          return row !== undefined ? rowToEntity(row) : null
        })(),
        toInfraError,
      ),

    /**
     * Looks up a user by email and includes the stored password hash.
     *
     * Why: Used exclusively by the authentication use case.
     *
     * @param email - The validated, branded email to search for.
     * @returns `ResultAsync` with `UserWithPassword` or null, or an `AppError`.
     */
    findByEmailWithPassword: (
      email: Email,
    ): ResultAsync<UserWithPassword | null, AppError> =>
      fromPromise(
        (async (): Promise<UserWithPassword | null> => {
          const rows: UserRow[] = await db
            .select()
            .from(users)
            .where(eq(users.email, email as string)) as UserRow[]
          const row: UserRow | undefined = rows[0]
          return row !== undefined ? rowToUserWithPassword(row) : null
        })(),
        toInfraError,
      ),
  }
}
