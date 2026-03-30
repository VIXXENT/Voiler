# ADR-003: Zod as Single Source of Truth

**Status:** Accepted
**Date:** 2025-03

## Context

A fullstack monorepo has multiple locations where data shapes are defined or assumed:
- GraphQL SDL type definitions
- Database columns (Drizzle table schema)
- TypeScript interfaces used by resolvers and use-cases
- Validation logic in use-cases or HTTP handlers

Without a single source of truth, these definitions drift apart. A field added to the DB
schema gets forgotten in the GraphQL type, or validation rules differ between layers.

Alternatives considered:

| Approach | Notes |
|----------|-------|
| GraphQL SDL as source | Code-gen tools exist but SDL is not portable outside GraphQL context |
| Drizzle table definitions | Only covers persistence; no runtime validation |
| Separate TS interfaces | Pure types with no runtime behavior; cannot validate user input |
| **Zod schemas** | Runtime validation + static type inference. Portable across all layers. |

## Decision

**`packages/schema`** is the single source of truth for all data shapes in the monorepo.

Every Zod schema in `packages/schema`:
1. Defines the authoritative shape of an entity, input, or output.
2. Produces the TypeScript type via `z.infer<typeof Schema>`.
3. Is imported by other packages — never duplicated.

Sub-directories:
- `entities/` — persistent models (`UserSchema`, `AuthSessionSchema`)
- `inputs/` — mutation/operation inputs (`CreateUserInput`, `LoginInput`)
- `outputs/` — response shapes (`PublicUser`, `AuthResponse`)
- `adapters/` — SQLite/Drizzle column type adapters

Environment variables are also validated with Zod in `packages/config-env/src/schema.ts`,
following the same principle.

## Consequences

**Positive:**
- One change propagates everywhere: update the Zod schema and TypeScript types,
  validation rules, and GraphQL types all derive from it.
- Runtime validation is free — pass user input through the schema at the boundary.
- `z.infer<>` gives accurate TypeScript types with zero manual maintenance.
- Shared across frontend and backend — the web app can import the same schemas.

**Negative:**
- GraphQL SDL in `typeDefs.ts` must be kept in sync with Zod schemas manually
  (code-gen is planned but not yet implemented).
- Zod adds a runtime dependency to packages that previously needed none.
- Overly strict schemas at the persistence layer can cause friction with DB migrations
  (nullable columns must be reflected in the Zod schema).

**Mitigations:**
- `packages/schema/src/adapters/sqlite.ts` bridges Drizzle column types and Zod schemas.
- SDL-to-Zod sync is enforced by E2E tests that exercise the full API surface.
