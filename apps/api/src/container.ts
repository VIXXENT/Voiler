import type { AppError } from '@voiler/core'
import type { UserEntity } from '@voiler/domain'
import type { ResultAsync } from 'neverthrow'

import { createArgon2PasswordService } from './adapters/auth/argon2-password-service.js'
import { createJwtTokenService } from './adapters/auth/jwt-token-service.js'
import {
  createDrizzleUserRepository,
  createFindPasswordHash,
} from './adapters/db/drizzle-user-repository.js'
import type { DbClient } from './db/index.js'
import { withAuditLog, type AuditableParams } from './logging/use-case-logger.js'
import type { AuthResult } from './use-cases/auth/authenticate.js'
import { createAuthenticate } from './use-cases/auth/authenticate.js'
import { createCreateUser } from './use-cases/user/create-user.js'
import { createGetUser } from './use-cases/user/get-user.js'
import { createListUsers } from './use-cases/user/list-users.js'

/**
 * Parameters for building the DI container.
 */
interface CreateContainerParams {
  readonly db: DbClient
  readonly authSecret: string
}

/**
 * Application DI container.
 *
 * Exposes pre-wired use-case functions ready for
 * injection into tRPC procedures.
 */
interface Container {
  readonly createUser: (
    params: {
      name: string
      email: string
      password: string
    } & AuditableParams,
  ) => ResultAsync<UserEntity, AppError>
  readonly getUser: (
    params: { id: string } & AuditableParams,
  ) => ResultAsync<UserEntity | null, AppError>
  readonly listUsers: () => ResultAsync<UserEntity[], AppError>
  readonly authenticate: (
    params: {
      email: string
      password: string
    } & AuditableParams,
  ) => ResultAsync<AuthResult, AppError>
}

/**
 * Build the application DI container.
 *
 * This is the ONLY file that imports concrete adapter
 * implementations. All other modules depend on port
 * interfaces defined in @voiler/core.
 */
const createContainer: (params: CreateContainerParams) => Container = (params) => {
  const { db, authSecret } = params

  // --- Adapters ---
  // eslint-disable-next-line @typescript-eslint/typedef
  const userRepository = createDrizzleUserRepository({
    db,
  })
  // eslint-disable-next-line @typescript-eslint/typedef
  const passwordService = createArgon2PasswordService()
  // eslint-disable-next-line @typescript-eslint/typedef
  const tokenService = createJwtTokenService({
    secret: authSecret,
  })
  // eslint-disable-next-line @typescript-eslint/typedef
  const findPasswordHash = createFindPasswordHash({
    db,
  })

  // --- Use Cases (raw) ---
  const rawCreateUser: Container['createUser'] = createCreateUser({
    userRepository,
    passwordService,
  })

  const rawGetUser: Container['getUser'] = createGetUser({
    userRepository,
  })

  const rawListUsers: Container['listUsers'] = createListUsers({ userRepository })

  const rawAuthenticate: Container['authenticate'] = createAuthenticate({
    userRepository,
    passwordService,
    tokenService,
    findPasswordHash,
  })

  // --- Wrap with audit logging ---
  const createUser: Container['createUser'] = withAuditLog({
    name: 'user.create',
    useCase: rawCreateUser,
    getEntityId: (result) => String(result.id),
    db,
  })

  const getUser: Container['getUser'] = withAuditLog({
    name: 'user.get',
    useCase: rawGetUser,
    getEntityId: (result) => (result ? String(result.id) : undefined),
    db,
  })

  // listUsers is a read-all query with no params —
  // audit logging is not applicable (no entity to track).
  const listUsers: Container['listUsers'] = rawListUsers

  const authenticate: Container['authenticate'] = withAuditLog({
    name: 'auth.authenticate',
    useCase: rawAuthenticate,
    getEntityId: (result) => String(result.user.id),
    db,
  })

  return {
    createUser,
    getUser,
    listUsers,
    authenticate,
  }
}

export { createContainer }
export type { Container, CreateContainerParams }
