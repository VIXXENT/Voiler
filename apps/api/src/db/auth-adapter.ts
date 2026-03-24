import {
  type Adapter,
  type AdapterUser,
  type AdapterAccount,
  type AdapterSession,
  type VerificationToken,
} from '@auth/core/adapters'
import { Result, fromPromise } from 'neverthrow'
import { db } from './index.js'
import { users, accounts, sessions, verificationTokens } from './schema.js'
import { eq, and } from 'drizzle-orm'
import {
  type User as SchemaUser,
  type Account as SchemaAccount,
  type Session as SchemaSession,
} from '@gemtest/schema'

/**
 * Parameters for the mapUser function.
 */
type MapUserParams = {
  readonly user: SchemaUser
};

/**
 * Maps a database user to an Auth.js adapter user.
 *
 * Auth.js expects string IDs and specific nullability for email verification.
 * This helper ensures the database entity matches the adapter interface.
 *
 * @param params - Object containing the user from the database schema.
 * @returns A user object compatible with the Auth.js AdapterUser interface.
 */
const mapUser = (params: MapUserParams): AdapterUser => {
  const { user }: MapUserParams = params
  return {
    ...user,
    id: user.id!.toString(),
    emailVerified: user.emailVerified || null,
  }
}

/**
 * Parameters for the mapSession function.
 */
type MapSessionParams = {
  readonly session: SchemaSession
};

/**
 * Maps a database session to an Auth.js adapter session.
 *
 * Auth.js expects string userId. Our DB stores integer userId.
 *
 * @param params - Object containing the session from the database schema.
 * @returns A session object compatible with the Auth.js AdapterSession interface.
 */
type MapSessionFn = (params: MapSessionParams) => AdapterSession

const mapSession: MapSessionFn = (params: MapSessionParams): AdapterSession => {
  const { session }: MapSessionParams = params
  return {
    sessionToken: session.sessionToken,
    userId: session.userId.toString(),
    expires: session.expires,
  }
}

/**
 * Custom Drizzle adapter for Auth.js.
 *
 * This adapter implements the persistence layer for authentication using Drizzle ORM
 * and SQLite. It follows the Neverthrow linear flow pattern for all operations,
 * ensuring robust error handling and type safety.
 *
 * Context: Auth.js uses string IDs, but our SQLite schema uses integers.
 * Conversions are handled during read/write operations.
 */
export const DrizzleAdapter: Adapter = {
  /**
   * Creates a new user in the database.
   *
   * @param user - The user data provided by Auth.js (without ID).
   * @returns A promise resolving to the created AdapterUser.
   */
  createUser: async (user: Omit<AdapterUser, 'id'>): Promise<AdapterUser> => {
    const insertResult: Result<unknown[], Error> = await fromPromise(
      db.insert(users).values({
        ...user,
        emailVerified: user.emailVerified,
      }).returning(),
      (err: unknown): Error => new Error(`DB Error creating user: ${String(err)}`),
    )

    if (insertResult.isErr()) {
      console.error(insertResult.error.message)
      throw insertResult.error
    }

    const inserted: unknown = insertResult.value[0]
    return mapUser({ user: inserted as SchemaUser })
  },

  /**
   * Retrieves a user by their unique identifier.
   *
   * @param id - The string representation of the user ID.
   * @returns A promise resolving to the AdapterUser or null if not found.
   */
  getUser: async (id: string): Promise<AdapterUser | null> => {
    const userId: number = parseInt(id, 10)
    const selectResult: Result<unknown[], Error> = await fromPromise(
      db.select().from(users).where(eq(users.id, userId)),
      (err: unknown): Error => new Error(`DB Error getting user: ${String(err)}`),
    )

    if (selectResult.isErr()) {
      console.warn(selectResult.error.message)
      return null
    }

    const user: unknown = selectResult.value[0]
    return user ? mapUser({ user: user as SchemaUser }) : null
  },

  /**
   * Retrieves a user by their registered email address.
   *
   * @param email - The email address to search for.
   * @returns A promise resolving to the AdapterUser or null if not found.
   */
  getUserByEmail: async (email: string): Promise<AdapterUser | null> => {
    const selectResult: Result<unknown[], Error> = await fromPromise(
      db.select().from(users).where(eq(users.email, email)),
      (err: unknown): Error => new Error(`DB Error getting user by email: ${String(err)}`),
    )

    if (selectResult.isErr()) {
      console.warn(selectResult.error.message)
      return null
    }

    const user: unknown = selectResult.value[0]
    return user ? mapUser({ user: user as SchemaUser }) : null
  },

  /**
   * Retrieves a user by their linked account (OAuth provider).
   *
   * @param params - Object containing provider and providerAccountId.
   * @returns A promise resolving to the AdapterUser or null if not found.
   */
  getUserByAccount: async (params: {
    readonly provider: string
    readonly providerAccountId: string
  }): Promise<AdapterUser | null> => {
    const { provider, providerAccountId } = params

    // 1. Find the linked account
    const accountResult: Result<unknown[], Error> = await fromPromise(
      db.select().from(accounts).where(
        and(
          eq(accounts.provider, provider),
          eq(accounts.providerAccountId, providerAccountId),
        ),
      ),
      (err: unknown): Error => new Error(`DB Error checking account: ${String(err)}`),
    )

    if (accountResult.isErr()) {
      console.warn(accountResult.error.message)
      return null
    }

    const foundAccount: SchemaAccount | undefined =
      accountResult.value[0] as SchemaAccount | undefined
    if (!foundAccount) {
      return null
    }

    // 2. Find the associated user
    const userResult: Result<unknown[], Error> = await fromPromise(
      db.select().from(users).where(eq(users.id, foundAccount.userId)),
      (err: unknown): Error => new Error(`DB Error getting user for account: ${String(err)}`),
    )

    if (userResult.isErr()) {
      console.warn(userResult.error.message)
      return null
    }

    const user: unknown = userResult.value[0]
    return user ? mapUser({ user: user as SchemaUser }) : null
  },

  /**
   * Updates an existing user's information.
   *
   * @param user - Object containing the user ID and the fields to update.
   * @returns A promise resolving to the updated AdapterUser.
   */
  updateUser: async (user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>): Promise<AdapterUser> => {
    const userId: number = parseInt(user.id, 10)
    const updateResult: Result<unknown[], Error> = await fromPromise(
      db.update(users).set({
        ...user,
        id: undefined,
        emailVerified: user.emailVerified,
      }).where(eq(users.id, userId)).returning(),
      (err: unknown): Error => new Error(`DB Error updating user: ${String(err)}`),
    )

    if (updateResult.isErr()) {
      console.error(updateResult.error.message)
      throw updateResult.error
    }

    const updated: unknown = updateResult.value[0]
    return mapUser({ user: updated as SchemaUser })
  },

  /**
   * Links a third-party account to a user.
   *
   * @param account - The account data provided by Auth.js.
   */
  linkAccount: async (account: AdapterAccount): Promise<void> => {
    const insertResult: Result<unknown, Error> = await fromPromise(
      db.insert(accounts).values({
        ...account,
        id: crypto.randomUUID(),
        userId: parseInt(account.userId, 10),
      }),
      (err: unknown): Error => new Error(`DB Error linking account: ${String(err)}`),
    )

    if (insertResult.isErr()) {
      console.error(insertResult.error.message)
    }
  },

  /**
   * Creates a new session for a user.
   *
   * @param session - The session data to create.
   * @returns A promise resolving to the created AdapterSession.
   */
  createSession: async (session: {
    readonly sessionToken: string
    readonly userId: string
    readonly expires: Date
  }): Promise<AdapterSession> => {
    const userId: number = parseInt(session.userId, 10)
    const insertResult: Result<unknown[], Error> = await fromPromise(
      db.insert(sessions).values({
        ...session,
        id: crypto.randomUUID(),
        userId,
      }).returning(),
      (err: unknown): Error => new Error(`DB Error creating session: ${String(err)}`),
    )

    if (insertResult.isErr()) {
      console.error(insertResult.error.message)
      throw insertResult.error
    }

    const inserted: SchemaSession | undefined = insertResult.value[0] as SchemaSession | undefined
    if (!inserted) {
      throw new Error('DB Error: session insert returned empty result')
    }
    return mapSession({ session: inserted })
  },

  /**
   * Retrieves a session and the user associated with it.
   *
   * @param sessionToken - The unique session token.
   * @returns A promise resolving to an object with session and user, or null.
   */
  getSessionAndUser: async (
    sessionToken: string,
  ): Promise<{ session: AdapterSession; user: AdapterUser } | null> => {
    // 1. Get the session
    const sessionResult: Result<unknown[], Error> = await fromPromise(
      db.select().from(sessions).where(eq(sessions.sessionToken, sessionToken)),
      (err: unknown): Error => new Error(`DB Error getting session: ${String(err)}`),
    )

    if (sessionResult.isErr()) {
      console.warn(sessionResult.error.message)
      return null
    }

    const foundSession: SchemaSession | undefined = sessionResult.value[0] as SchemaSession | undefined
    if (!foundSession) {
      return null
    }

    // 2. Get the associated user
    const userResult: Result<unknown[], Error> = await fromPromise(
      db.select().from(users).where(eq(users.id, foundSession.userId)),
      (err: unknown): Error => new Error(`DB Error getting user for session: ${String(err)}`),
    )

    if (userResult.isErr()) {
      console.warn(userResult.error.message)
      return null
    }

    const user: unknown = userResult.value[0]
    if (!user) {
      return null
    }

    return {
      session: mapSession({ session: foundSession }),
      user: mapUser({ user: user as SchemaUser }),
    }
  },

  /**
   * Updates an existing session's expiry date or token.
   *
   * @param session - Object containing the token and fields to update.
   * @returns A promise resolving to the updated session, or null/undefined.
   */
  updateSession: async (
    session: Partial<AdapterSession> & Pick<AdapterSession, 'sessionToken'>,
  ): Promise<AdapterSession | null | undefined> => {
    const updateResult: Result<unknown[], Error> = await fromPromise(
      db.update(sessions).set({
        ...session,
        userId: session.userId ? parseInt(session.userId, 10) : undefined,
      }).where(eq(sessions.sessionToken, session.sessionToken)).returning(),
      (err: unknown): Error => new Error(`DB Error updating session: ${String(err)}`),
    )

    if (updateResult.isErr()) {
      console.warn(updateResult.error.message)
      return null
    }

    const updated: SchemaSession | undefined = updateResult.value[0] as SchemaSession | undefined
    if (!updated) {
      return null
    }

    return mapSession({ session: updated })
  },

  /**
   * Deletes a session by its token.
   *
   * @param sessionToken - The token of the session to remove.
   */
  deleteSession: async (sessionToken: string): Promise<void> => {
    const deleteResult: Result<unknown, Error> = await fromPromise(
      db.delete(sessions).where(eq(sessions.sessionToken, sessionToken)),
      (err: unknown): Error => new Error(`DB Error deleting session: ${String(err)}`),
    )

    if (deleteResult.isErr()) {
      console.error(deleteResult.error.message)
    }
  },

  /**
   * Creates a new verification token for Magic Links or MFA.
   *
   * @param verificationToken - The token data to persist.
   * @returns A promise resolving to the created token.
   */
  createVerificationToken: async (
    verificationToken: VerificationToken,
  ): Promise<VerificationToken | null | undefined> => {
    const insertResult: Result<unknown[], Error> = await fromPromise(
      db.insert(verificationTokens).values({
        identifier: verificationToken.identifier,
        token: verificationToken.token,
        expires: verificationToken.expires,
      }).returning(),
      (err: unknown): Error => new Error(`DB Error creating verification token: ${String(err)}`),
    )

    if (insertResult.isErr()) {
      console.error(insertResult.error.message)
      return undefined
    }

    return insertResult.value[0] as VerificationToken
  },

  /**
   * Retrieves and immediately deletes a verification token (one-time use).
   *
   * @param params - Object containing the identifier and token string.
   * @returns A promise resolving to the token if it matched and was deleted.
   */
  useVerificationToken: async (params: {
    readonly identifier: string
    readonly token: string
  }): Promise<VerificationToken | null> => {
    const { identifier, token } = params

    // 1. Find the token
    const findResult: Result<unknown[], Error> = await fromPromise(
      db.select().from(verificationTokens).where(
        and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, token),
        ),
      ),
      (err: unknown): Error => new Error(`DB Error checking verification token: ${String(err)}`),
    )

    if (findResult.isErr()) {
      console.error(findResult.error.message)
      return null
    }

    const foundToken: unknown = findResult.value[0]
    if (!foundToken) {
      return null
    }

    // 2. Delete the token (atomic consumption)
    const deleteResult: Result<unknown, Error> = await fromPromise(
      db.delete(verificationTokens).where(
        and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, token),
        ),
      ),
      (err: unknown): Error => new Error(`DB Error deleting token: ${String(err)}`),
    )

    if (deleteResult.isErr()) {
      console.error(deleteResult.error.message)
      return null
    }

    return foundToken as VerificationToken
  },
}
