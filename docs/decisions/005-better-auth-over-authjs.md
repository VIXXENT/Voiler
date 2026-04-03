# ADR-005: Better Auth Over Auth.js

**Status:** Accepted
**Date:** 2026-04-03

## Context

The application requires authentication with the following capabilities:

1. Email/password and OAuth (GitHub, Google at minimum).
2. Database-persisted sessions — not JWTs stored in cookies, which require rotation
   and revocation infrastructure.
3. An impersonation mechanism for admin workflows.
4. Drizzle ORM integration — session and user tables should live in the application
   database and be queryable with the existing ORM.
5. TypeScript-native API — the auth library should not require manual type augmentation.

The auth layer must integrate with Hono (the HTTP server) and expose typed helpers
usable in tRPC context.

## Decision

We use [Better Auth](https://better-auth.com) as the authentication library.

- Better Auth is configured in `apps/api/src/lib/auth.ts` with the Drizzle adapter.
- Session tables are generated and managed by Better Auth's schema utilities, then
  merged with the application Drizzle schema.
- The `impersonation` plugin is enabled, allowing admin users to act as other users.
- OAuth providers (GitHub, Google) are configured via environment variables.
- Better Auth's Hono integration mounts auth routes at `/api/auth/*`.
- The tRPC context reads the session from Better Auth on each request.

## Alternatives Considered

**Auth.js (NextAuth v5)**
Auth.js is the most widely adopted auth library for Node.js. However:

- It was designed for Next.js and has first-class support for Next.js App Router.
  Integrating with Hono requires community adapters with uncertain maintenance.
- Its database adapter for Drizzle exists but requires schema conventions that
  conflict with the application schema design.
- Session handling defaults to JWT; database sessions require explicit configuration
  and are less ergonomic.
- Impersonation is not a built-in feature; implementing it requires patching the
  session callback.

**Lucia**
Lucia v3 is a minimal, framework-agnostic session library. It provides session
management primitives but not a full auth solution. OAuth flows, email verification,
and password hashing must be implemented manually or via separate packages. This is
appropriate for teams wanting full control but adds significant implementation scope
for a boilerplate.

**Custom implementation**
Building auth from primitives (`oslo`, `arctic` for OAuth, `argon2` for hashing)
gives maximum control. The risk is implementing security-sensitive code incorrectly.
Better Auth handles the security-critical paths (password hashing, session token
generation, CSRF protection) with a maintained library.

**Clerk / Auth0 (managed services)**
Excellent developer experience but introduce a third-party dependency for a
security-critical path. Not suitable for self-hosted deployments. Also add per-MAU
cost.

## Consequences

**Positive:**

- Database sessions are first-class; revocation is a single row delete.
- Impersonation is a built-in plugin — no custom session manipulation required.
- Drizzle adapter keeps auth tables in the application database, queryable with
  the same ORM as the rest of the application.
- OAuth providers are configured declaratively; adding a new provider is a
  one-line change.
- TypeScript types for sessions and users are generated from the schema, not
  written manually.

**Negative:**

- Better Auth is newer and less battle-tested than Auth.js. Community resources and
  Stack Overflow coverage are thinner.
- Schema migrations for auth tables are managed separately from application
  migrations; a merge step is required when updating Better Auth versions.
- Fewer community plugins than Auth.js at the time of decision.
