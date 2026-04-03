import type { AppError } from '@voiler/core'
import type { UserEntity } from '@voiler/domain'
import type { ResultAsync } from 'neverthrow'

import { createDrizzleUserRepository } from './adapters/db/drizzle-user-repository.js'
// [MODULE:payments] import { createStubPaymentService } from '@voiler/mod-payments'
// [MODULE:payments] import type { IPaymentService } from '@voiler/mod-payments'
// [MODULE:email] import { createStubEmailService } from '@voiler/mod-email'
// [MODULE:email] import type { IEmailService } from '@voiler/mod-email'
import type { DbClient } from './db/index.js'
import { withAuditLog, type AuditableParams } from './logging/use-case-logger.js'
import { createCreateUser } from './use-cases/user/create-user.js'
import { createGetUser } from './use-cases/user/get-user.js'
import { createListUsers } from './use-cases/user/list-users.js'

/**
 * Parameters for building the DI container.
 */
interface CreateContainerParams {
  readonly db: DbClient
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
    } & AuditableParams,
  ) => ResultAsync<UserEntity, AppError>
  readonly getUser: (
    params: { id: string } & AuditableParams,
  ) => ResultAsync<UserEntity | null, AppError>
  readonly listUsers: () => ResultAsync<UserEntity[], AppError>
  // [MODULE:payments] readonly paymentService: IPaymentService
  // [MODULE:email] readonly emailService: IEmailService
}

/**
 * Build the application DI container.
 *
 * This is the ONLY file that imports concrete adapter
 * implementations. All other modules depend on port
 * interfaces defined in @voiler/core.
 */
const createContainer: (params: CreateContainerParams) => Container = (params) => {
  const { db } = params

  // --- Adapters ---

  // [MODULE:payments] const paymentService = createStubPaymentService()
  // [MODULE:email] const emailService = createStubEmailService()

  const userRepository = createDrizzleUserRepository({
    db,
  })

  // --- Use Cases (raw) ---
  const rawCreateUser: Container['createUser'] = createCreateUser({
    userRepository,
  })

  const rawGetUser: Container['getUser'] = createGetUser({
    userRepository,
  })

  const rawListUsers: Container['listUsers'] = createListUsers({ userRepository })

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

  return {
    createUser,
    getUser,
    listUsers,
    // [MODULE:payments] paymentService,
    // [MODULE:email] emailService,
  }
}

export { createContainer }
export type { Container, CreateContainerParams }
