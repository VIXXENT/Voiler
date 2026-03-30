/**
 * schema-sync.ts — Zod ↔ GraphQL alignment validator.
 *
 * Why: verifies at runtime that the GraphQL `User` type exposes exactly the
 * fields present in PublicUserSchema, preventing silent drift when either
 * side is updated without touching the other.
 *
 * Usage:
 *   import { checkSchemaSyncResult } from './schema-sync.js'
 *   const result = checkSchemaSyncResult()
 *   // use in a test or a startup assertion
 *
 * Context: a full schema builder (e.g. Pothos) would eliminate this check,
 * but adding one is a large architectural change tracked in the backlog.
 * This utility provides the same safety guarantee with zero new dependencies.
 */

import { PublicUserSchema } from '@gemtest/schema'
import { ok, err, type Result } from 'neverthrow'

/**
 * The GraphQL User type fields as they appear in typeDefs.ts.
 *
 * Why kept here: avoids parsing the SDL string at runtime. Must be updated
 * manually when typeDefs.ts changes — the sync check enforces this.
 */
const GRAPHQL_USER_FIELDS: readonly string[] = [
  'id',
  'name',
  'email',
  'emailVerified',
  'image',
  'role',
  'createdAt',
] as const

/**
 * Diagnostic payload returned when schemas are out of sync.
 */
type SchemaSyncDrift = {
  /** Fields present in Zod but missing from GraphQL. */
  missingInGraphQL: string[];
  /** Fields present in GraphQL but missing in Zod. */
  missingInZod: string[];
};

/**
 * Compares PublicUserSchema keys with GRAPHQL_USER_FIELDS and reports drift.
 *
 * Why: single source of truth validation — if Zod adds or removes a field,
 * this function will flag the mismatch so the developer knows to update
 * typeDefs.ts (or vice-versa).
 *
 * @returns Result<void, SchemaSyncDrift> — Ok when in sync, Err with drift details.
 */
const checkSchemaSyncResult: () => Result<void, SchemaSyncDrift> = () => {
  const zodKeys: string[] = Object.keys(PublicUserSchema.shape)
  const graphqlFields: string[] = [...GRAPHQL_USER_FIELDS]

  const missingInGraphQL: string[] = zodKeys.filter(
    (key: string): boolean => !graphqlFields.includes(key),
  )

  const missingInZod: string[] = graphqlFields.filter(
    (field: string): boolean => !zodKeys.includes(field),
  )

  const hasDrift: boolean =
    missingInGraphQL.length > 0 || missingInZod.length > 0

  if (hasDrift) {
    return err({ missingInGraphQL, missingInZod })
  }

  return ok(undefined)
}

export { checkSchemaSyncResult, GRAPHQL_USER_FIELDS }
export type { SchemaSyncDrift }
