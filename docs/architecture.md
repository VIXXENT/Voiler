# Architecture

GemTest uses Hexagonal Architecture (Ports & Adapters) to keep the domain logic
completely isolated from infrastructure concerns.

## Layers

### 1. Primary Adapters (Driving Side)
Entry points that trigger application use-cases.

- `apps/api/src/graphql/resolvers.ts` — GraphQL resolvers receive incoming queries/mutations
- `apps/api/src/graphql/typeDefs.ts` — SDL type definitions
- `apps/api/src/lib/auth.ts` — Auth.js HTTP handler (sessions, callbacks)

Primary adapters call use-cases; they never contain business logic.

### 2. Application Layer (Use-Cases)
Orchestrate domain objects and call ports to fulfill a request.

Location: `apps/api/src/use-cases/`

| File | Responsibility |
|------|---------------|
| `auth/authenticate.ts` | Validate credentials, issue session token |
| `user/create-user.ts` | Hash password, persist User entity |
| `user/get-user.ts` | Fetch single user by ID |
| `user/list-users.ts` | Return paginated user list |

Use-cases depend only on port interfaces (`packages/core`), never on concrete adapters.

### 3. Domain + Ports (`packages/domain` and `packages/core`)

**packages/domain** — Pure domain, zero dependencies.
- `entities/user.ts` — User aggregate root
- `value-objects/email.ts`, `value-objects/password.ts`, `value-objects/user-id.ts` — Branded types
- `errors/domain-error.ts` — Tagged union of business rule violations

**packages/core** — Port interfaces (abstract contracts).
- `repositories/user.repository.ts` — `UserRepository` port
- `repositories/base.repository.ts` — Base CRUD port
- `services/password.service.ts` — `PasswordService` port
- `services/token.service.ts` — `TokenService` port
- `services/email.service.ts` — `EmailService` port
- `errors/app-error.ts` — Application-level error union

### 4. Secondary Adapters (Driven Side)
Concrete implementations of the ports defined in `packages/core`.

Location: `apps/api/src/adapters/`

| Adapter | Port Implemented |
|---------|-----------------|
| `db/drizzle-user-repository.ts` | `UserRepository` (SQLite via Drizzle ORM) |
| `auth/argon2-password-service.ts` | `PasswordService` (Argon2id hashing) |
| `auth/jwt-token-service.ts` | `TokenService` (jose, HS256) |
| `email/mock-email-service.ts` | `EmailService` (console stub, dev only) |

## Composition Root

`apps/api/src/adapters/index.ts` — instantiates all secondary adapters and wires them
into use-case constructors. This is the only place in the codebase where concrete
implementations are referenced.

## Module Dependency Diagram

```
Primary Adapters (resolvers, auth handler)
        │
        ▼
   Use-Cases (authenticate, create-user, …)
        │
        ▼  (depends on interfaces only)
packages/core (ports: UserRepository, PasswordService, …)
packages/domain (entities, value-objects, DomainError)
packages/schema (Zod schemas → TypeScript types)
        ▲
        │
Secondary Adapters (Drizzle, Argon2, JWT, MockEmail)
```

## Shared Packages

| Package | Role |
|---------|------|
| `packages/schema` | Zod schemas → inferred TS types. Single source of truth. |
| `packages/config-env` | Env-var validation per environment (BaseEnvSchema, ProductionEnvSchema, TestEnvSchema) |
| `packages/context-engine` | LanceDB RAG pipeline for AI-assisted development |
| `packages/ui` | Shared React components (Tailwind) |
| `packages/config-ts` | Shared `tsconfig.base.json` |
