import {
  UserSchema,
  AccountSchema,
  SessionSchema,
  VerificationTokenSchema,
  zodToSqliteTable,
} from '@gemtest/schema'
import { type sqliteTable } from 'drizzle-orm/sqlite-core'

/**
 * Users table defined from UserSchema.
 */
export const users: ReturnType<typeof sqliteTable> = zodToSqliteTable({
  tableName: 'users',
  zodObject: UserSchema,
  overrides: {
    id: { primaryKey: true, autoIncrement: true },
    email: { unique: true },
  },
})

/**
 * Accounts table for OAuth links.
 */
export const accounts: ReturnType<typeof sqliteTable> = zodToSqliteTable({
  tableName: 'accounts',
  zodObject: AccountSchema,
  overrides: {
    id: { primaryKey: true }, // Auth.js often uses string IDs for these
    userId: { notNull: true }, // We'll handle relations via queries or Drizzle's relations API
  },
})

/**
 * Sessions table for database sessions.
 */
export const sessions: ReturnType<typeof sqliteTable> = zodToSqliteTable({
  tableName: 'sessions',
  zodObject: SessionSchema,
  overrides: {
    id: { primaryKey: true },
    sessionToken: { unique: true },
    userId: { notNull: true },
  },
})

/**
 * VerificationTokens table for Magic Links and Recovery.
 */
export const verificationTokens: ReturnType<typeof sqliteTable> = zodToSqliteTable({
  tableName: 'verification_tokens',
  zodObject: VerificationTokenSchema,
  overrides: {
    identifier: { notNull: true },
    token: { primaryKey: true },
  },
})
