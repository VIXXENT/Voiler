# @gemtest/api

Apollo Server + Express + Drizzle ORM + SQLite (LibSQL) — hexagonal architecture.

## Purpose

The API application wires all hexagonal layers together into a running HTTP server.
It exposes a GraphQL endpoint (Apollo Server) and REST routes (health, Auth.js webhooks).
`container.ts` is the single composition root — the only file that imports concrete adapters.

## Source layout

```
src/
  adapters/                          # Secondary adapters (infrastructure implementations)
    auth/
      argon2-password-service.ts     # IPasswordService via Argon2
      jwt-token-service.ts           # ITokenService via jose (JWT)
    db/
      drizzle-user-repository.ts     # IUserRepository via Drizzle ORM
    email/
      mock-email-service.ts          # IEmailService mock (logs to console)
    index.ts                         # Barrel re-exports
  db/
    auth-adapter.ts                  # Auth.js ↔ Drizzle adapter (session tables)
    index.ts                         # LibSQL client + Drizzle instance + auto-migrate
    schema.ts                        # Drizzle table defs (generated from @gemtest/schema)
  graphql/
    resolvers.ts                     # Thin resolvers — delegate to container use cases
    schema-sync.ts                   # Validates GraphQL schema matches Zod models at boot
    typeDefs.ts                      # GraphQL SDL type definitions
  http/
    health.ts                        # GET /health route
    index.ts                         # Mounts all HTTP routes
    webhooks.ts                      # Auth.js webhook handlers
  lib/
    auth.ts                          # Auth.js handler configuration
    auth.types.ts                    # Auth.js session/user type extensions
    logger.ts                        # Winston logger (writes to logs/api.log)
  use-cases/
    auth/
      authenticate.ts                # Authenticate use case (login flow)
    user/
      create-user.ts                 # CreateUser use case
      get-user.ts                    # GetUser use case
      list-users.ts                  # ListUsers use case
    index.ts                         # Barrel re-exports
  container.ts                       # DI composition root — wires adapters + use cases
  errors.ts                          # Legacy error types (being phased out)
  index.ts                           # Express server entry point (port, middleware, boot)
```

## Dependencies

**Workspace:**
- `@gemtest/core` — port interfaces (IUserRepository, IPasswordService, ITokenService, AppError)
- `@gemtest/domain` — domain types (UserEntity, DomainError)
- `@gemtest/schema` — Zod schemas (zodToSqliteTable, PublicUser, AuthResponse, inputs)

**External:**
- `@apollo/server` — GraphQL server
- `@auth/core` — Auth.js session management
- `express` — HTTP server
- `drizzle-orm` + `@libsql/client` — SQLite ORM + LibSQL driver
- `argon2` — password hashing
- `jose` — JWT generation/verification
- `nodemailer` — email delivery (mock only, currently)
- `neverthrow` — Result/ResultAsync (via @gemtest/core)

## Architecture rules

- `container.ts` is the ONLY file that imports concrete adapter classes.
- All use cases depend solely on port interfaces from `@gemtest/core`.
- Resolvers must stay thin: receive input → call container → return result. No business logic.
- Use cases return `ResultAsync<T, AppError>`. Resolvers map errors to GraphQL errors.
- `errors.ts` is legacy — do not add new error types there. Use `AppError` from `@gemtest/core`.
- `throw` is forbidden except in `lib/logger.ts` and unrecoverable startup errors.
- See root CLAUDE.md for global coding standards (typing, neverthrow, JSDoc).
