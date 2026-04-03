# ADR-004: tRPC Over GraphQL

**Status:** Accepted
**Date:** 2026-04-03

## Context

The API layer needs to expose typed procedures to a TypeScript frontend. The primary
requirements are:

1. End-to-end type safety — a change to a procedure signature should surface as a
   TypeScript error in the client without manual type regeneration.
2. Low boilerplate — defining a new endpoint should not require touching a schema
   file, a resolver file, and a client type file separately.
3. Composable middleware — auth, rate limiting, and logging should apply to procedure
   groups without repeating code.
4. Compatible with the Hono HTTP server — the API runs on Hono; the RPC layer should
   integrate cleanly.

## Decision

We use [tRPC v11](https://trpc.io) as the RPC framework, mounted on a Hono router via
`@hono/trpc-server`.

- Procedures are defined in `apps/api/src/routers/`.
- Input is validated with Zod schemas from `packages/schema`.
- Context is built once per request in `apps/api/src/trpc/context.ts` and carries
  the authenticated session and injected use-case dependencies.
- Routers are thin: they parse input, call a use case, and return the result.
  No business logic lives in a router.
- The client (`packages/client`) exports a typed tRPC client using `createTRPCClient`.

## Alternatives Considered

**GraphQL (Apollo Server / Pothos)**
GraphQL provides a self-documenting schema, powerful query flexibility, and a rich
ecosystem. However, for a TypeScript-only client/server pair:

- The schema is a third artifact (SDL) that must stay in sync with resolvers and
  TypeScript types. tRPC eliminates this duplication.
- Type generation requires a codegen step (`graphql-codegen`). tRPC types flow
  directly through the TypeScript compiler.
- GraphQL query flexibility (field selection, nested queries) is valuable for
  public APIs or multiple consumers. Voiler has one TypeScript consumer.
- Resolver boilerplate is higher than tRPC procedure definitions.

GraphQL remains the right choice if the API needs to serve mobile apps, third-party
consumers, or a schema-first contract. That is not the current use case.

**REST with OpenAPI**
REST is universally understood and tooling is mature. But generating a typed client
from an OpenAPI spec requires a codegen step, and keeping the spec in sync with
implementation requires discipline or additional tooling (e.g., Zod-to-OpenAPI).
tRPC gives the same type safety with less configuration.

**Hono RPC (built-in)**
Hono has a built-in typed RPC layer. It is lighter weight than tRPC but has a smaller
ecosystem, fewer middleware primitives, and no subscription support. tRPC's middleware
composition model is more expressive for auth and multi-tenant scenarios.

## Consequences

**Positive:**

- A TypeScript error at the API definition immediately surfaces in the client.
  No codegen, no drift.
- Adding a new procedure requires one file edit; the client type updates
  automatically.
- Input validation is handled by Zod at the procedure boundary — no duplicate
  parsing logic.
- tRPC middleware composes cleanly with Hono middleware at the HTTP level.

**Negative:**

- tRPC is not consumable by non-TypeScript clients without an OpenAPI adapter
  (e.g., `trpc-openapi`). If a public REST API is needed later, an adapter layer
  must be added.
- Debugging tRPC errors requires understanding the tRPC error shape; HTTP status
  codes are less granular by default.
- Subscriptions require WebSocket or SSE setup; not needed now but adds complexity
  if introduced later.
