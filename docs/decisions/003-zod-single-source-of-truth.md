# ADR-003: Zod as Single Source of Truth for Validation and Types

**Status:** Accepted
**Date:** 2026-04-03

## Context

A fullstack application needs validation in multiple places: database schema, API
input parsing, form validation, and internal domain invariants. Without a shared
source of truth, these definitions drift. A field added to the database requires
matching updates to DTOs, form schemas, and TypeScript interfaces — each a separate
file, each a potential mismatch.

We need a validation library that:

1. Produces TypeScript types automatically, so there is one definition per entity.
2. Runs at runtime for input parsing (tRPC, form data, environment variables).
3. Integrates with the ORM so database schema and validation stay in sync.
4. Is composable — partial schemas, transforms, and refinements should be first-class.

## Decision

[Zod](https://zod.dev) is the single source of truth for all validation and type
definitions in Voiler.

- `packages/schema` contains Zod schemas for all entities. TypeScript types are
  derived with `z.infer<>`, never written by hand.
- `drizzle-zod` generates Zod insert/select schemas directly from Drizzle table
  definitions, keeping ORM schema and validation in sync.
- tRPC input validators are Zod schemas from `packages/schema`.
- Environment variable validation (`packages/env`) uses Zod to fail fast on startup.
- Domain value objects use Zod `.brand()` for nominal typing without runtime overhead.

The ESLint rule `@typescript-eslint/typedef` is disabled per-line for Zod `const`
declarations, since the type is inferred from the schema.

## Alternatives Considered

**io-ts**
Functional codec library with strong theoretical foundations. However, it requires
`fp-ts` as a peer, produces verbose error messages by default, and has a steeper
learning curve. Zod's error messages are more developer-friendly and its API is
more ergonomic for typical web application schemas.

**Yup**
Popular in form libraries. Lacks native TypeScript-first design; types are inferred
less precisely. Does not integrate with Drizzle. Async validation is less composable.

**Valibot**
Newer, tree-shakable, smaller bundle. Less mature ecosystem and fewer integrations
(notably no official drizzle-valibot at the time of decision). Worth revisiting.

**Separate TypeScript interfaces + manual validation**
Defining types in `.d.ts` files and writing validation logic separately. This is
the source of drift the decision is designed to eliminate. Any change to a type
requires finding and updating all validators manually.

**Arktype**
Strong static type inference without codegen. Less ecosystem support and fewer
Drizzle integrations than Zod at the time of decision.

## Consequences

**Positive:**

- One schema definition produces the TypeScript type, the runtime validator, and
  the database insert/select types via `drizzle-zod`.
- Refactoring an entity requires editing one schema; downstream types update
  automatically via `z.infer<>`.
- tRPC input validation and form validation reuse the same schema objects.
- AI agents have a single location to look up or modify type definitions.

**Negative:**

- `drizzle-zod` version pinning is required; minor versions have broken inference.
  (Pinned to a known-good version in `packages/schema/package.json`.)
- Very complex schemas (recursive types, highly conditional transforms) can produce
  inscrutable TypeScript errors.
- Bundle size: Zod is ~14 KB minified+gzipped. Acceptable for server-side use;
  requires tree-shaking discipline for client bundles.
