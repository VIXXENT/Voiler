/**
 * Composition root — Dependency Injection container.
 *
 * Why: This is the SINGLE file in the application that imports concrete adapter
 * implementations. Every other module depends only on port interfaces defined in
 * @gemtest/core. Wiring happens here once; consumers receive ready-to-use use-case
 * execute functions via the exported `container` object.
 *
 * Architecture note:
 *   Adapters (infrastructure) → injected into → Use cases (application)
 *   Nothing outside this file needs to know which adapter is in use.
 */

import { db } from './db/index.js'

import {
  createDrizzleUserRepository,
  createArgon2PasswordService,
  createMockEmailService,
  createJwtTokenService,
} from './adapters/index.js'

import {
  createUserUseCase,
  getUserUseCase,
  listUsersUseCase,
  authenticateUseCase,
} from './use-cases/index.js'

// ---------------------------------------------------------------------------
// Container type
// ---------------------------------------------------------------------------

/**
 * Shape of the application DI container.
 *
 * All properties are readonly execute functions returned by use-case factories.
 * Types are derived from the factory return types to avoid manual re-definition.
 */
type Container = {
  readonly createUser: ReturnType<typeof createUserUseCase>
  readonly getUser: ReturnType<typeof getUserUseCase>
  readonly listUsers: ReturnType<typeof listUsersUseCase>
  readonly authenticate: ReturnType<typeof authenticateUseCase>
}

// ---------------------------------------------------------------------------
// Adapter instantiation
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/typedef
const userRepository = createDrizzleUserRepository({ db })

// eslint-disable-next-line @typescript-eslint/typedef
const passwordService = createArgon2PasswordService()

// eslint-disable-next-line @typescript-eslint/typedef
const emailService = createMockEmailService()

/**
 * Token service requires AUTH_SECRET at startup.
 * The non-null assertion (!) is intentional: the app must fail fast if
 * AUTH_SECRET is not set — a missing secret is a fatal misconfiguration.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const tokenService = createJwtTokenService({
  secret: process.env['AUTH_SECRET']!,
})

// ---------------------------------------------------------------------------
// Container assembly
// ---------------------------------------------------------------------------

/**
 * Application DI container.
 *
 * Exports all wired use-case execute functions. Resolvers and other consumers
 * import from this object; they receive port-typed execute functions and remain
 * fully decoupled from infrastructure.
 *
 * @example
 * ```ts
 * import { container } from './container.js'
 * const result = await container.createUser({ name, email, password })
 * ```
 */
export const container: Container = {
  createUser: createUserUseCase({ userRepository, passwordService }),
  getUser: getUserUseCase({ userRepository }),
  listUsers: listUsersUseCase({ userRepository }),
  authenticate: authenticateUseCase({ userRepository, passwordService, tokenService }),
}

// Suppress unused-variable warning: emailService is wired but reserved for future use cases
void emailService
