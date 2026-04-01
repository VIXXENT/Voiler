import type { AppError, IUserRepository } from '@voiler/core'
import { infrastructureError } from '@voiler/core'
import type { DomainError, Email, UserEntity, UserId } from '@voiler/domain'
import { createEmail, createUserId } from '@voiler/domain'
import { eq } from 'drizzle-orm'
import type { Result } from 'neverthrow'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'

import type { DbClient } from '../../db/index.js'
import { User } from '../../db/schema.js'

/**
 * Drizzle row type for the User table.
 */
type UserRow = typeof User.$inferSelect

/**
 * Parameters for creating a DrizzleUserRepository.
 */
interface CreateDrizzleUserRepositoryParams {
  db: DbClient
}

/**
 * Map a raw Drizzle row to a domain UserEntity.
 *
 * Converts string columns into branded value objects.
 * Returns a ResultAsync so callers can chain safely.
 */
const mapRowToEntity: (params: { row: UserRow }) => ResultAsync<UserEntity, AppError> = (
  params,
) => {
  const { row } = params

  const idResult: Result<UserId, DomainError> = createUserId({ value: row.id })
  const emailResult: Result<Email, DomainError> = createEmail({ value: row.email })

  if (idResult.isErr()) {
    return errAsync(idResult.error)
  }

  if (emailResult.isErr()) {
    return errAsync(emailResult.error)
  }

  const entity: UserEntity = {
    id: idResult.value,
    email: emailResult.value,
    name: row.name,
    role: row.role,
    createdAt: row.createdAt,
  }

  return okAsync(entity)
}

/**
 * Create a Drizzle-backed implementation of IUserRepository.
 *
 * All queries are wrapped in ResultAsync for safe error
 * propagation through the hexagonal architecture.
 */
const createDrizzleUserRepository: (
  params: CreateDrizzleUserRepositoryParams,
) => IUserRepository = (params) => {
  const { db } = params

  const create: IUserRepository['create'] = (createParams) => {
    const { data } = createParams

    return ResultAsync.fromPromise(
      db
        .insert(User)
        .values({
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role ?? 'user',
        })
        .returning(),
      (cause) =>
        infrastructureError({
          message: 'Failed to create user',
          cause,
        }),
    ).andThen((rows) => {
      const row: UserRow | undefined = rows[0]

      if (!row) {
        return errAsync(
          infrastructureError({
            message: 'Insert returned no rows',
          }),
        )
      }

      return mapRowToEntity({ row })
    })
  }

  const findAll: IUserRepository['findAll'] = () => {
    return ResultAsync.fromPromise(db.select().from(User), (cause) =>
      infrastructureError({
        message: 'Failed to fetch users',
        cause,
      }),
    ).andThen((rows) => {
      const mapped: ResultAsync<UserEntity, AppError>[] = rows.map((row) => mapRowToEntity({ row }))

      return ResultAsync.combine(mapped)
    })
  }

  const findById: IUserRepository['findById'] = (findParams) => {
    return ResultAsync.fromPromise(
      db.select().from(User).where(eq(User.id, findParams.id)),
      (cause) =>
        infrastructureError({
          message: 'Failed to find user by id',
          cause,
        }),
    ).andThen((rows) => {
      const firstRow: typeof User.$inferSelect | undefined = rows[0]

      if (!firstRow) {
        return okAsync(null)
      }

      return mapRowToEntity({ row: firstRow })
    })
  }

  const findByEmail: IUserRepository['findByEmail'] = (findParams) => {
    const rawEmail: string = String(findParams.email)

    return ResultAsync.fromPromise(
      db.select().from(User).where(eq(User.email, rawEmail)),
      (cause) =>
        infrastructureError({
          message: 'Failed to find user by email',
          cause,
        }),
    ).andThen((rows) => {
      const firstRow: typeof User.$inferSelect | undefined = rows[0]

      if (!firstRow) {
        return okAsync(null)
      }

      return mapRowToEntity({ row: firstRow })
    })
  }

  const update: IUserRepository['update'] = (updateParams) => {
    const { id, data } = updateParams

    const values: {
      name?: string
      email?: string
      role?: string
    } = {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
    }

    return ResultAsync.fromPromise(
      db.update(User).set(values).where(eq(User.id, id)).returning(),
      (cause) =>
        infrastructureError({
          message: 'Failed to update user',
          cause,
        }),
    ).andThen((rows) => {
      const row: UserRow | undefined = rows[0]

      if (!row) {
        return errAsync(
          infrastructureError({
            message: 'Update returned no rows',
          }),
        )
      }

      return mapRowToEntity({ row })
    })
  }

  const del: IUserRepository['delete'] = (deleteParams) => {
    return ResultAsync.fromPromise(
      db
        .delete(User)
        .where(eq(User.id, deleteParams.id))
        .returning()
        .then((rows) => rows.length > 0),
      (cause) =>
        infrastructureError({
          message: 'Failed to delete user',
          cause,
        }),
    )
  }

  return {
    create,
    findAll,
    findById,
    findByEmail,
    update,
    delete: del,
  }
}

/**
 * Create a function that retrieves a user's password hash by email.
 *
 * @remarks
 * Separated from IUserRepository to avoid exposing password
 * hashes through the domain entity. Used only by the
 * authenticate use case.
 */
const createFindPasswordHash: (
  params: CreateDrizzleUserRepositoryParams,
) => (params: { email: string }) => ResultAsync<string | null, AppError> = (
  repoParams,
) => {
  const { db } = repoParams

  return (queryParams) => {
    return ResultAsync.fromPromise(
      db
        .select({ passwordHash: User.passwordHash })
        .from(User)
        .where(eq(User.email, queryParams.email)),
      (cause) =>
        infrastructureError({
          message: 'Failed to find password hash',
          cause,
        }),
    ).map((rows) => {
      const first: { passwordHash: string } | undefined = rows[0]

      return first?.passwordHash ?? null
    })
  }
}

export { createDrizzleUserRepository, createFindPasswordHash }
export type { CreateDrizzleUserRepositoryParams }
