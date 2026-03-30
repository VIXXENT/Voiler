# Authentication

GemTest uses [Auth.js v5](https://authjs.dev/) with a custom `DrizzleAdapter` backed by
a SQLite database. The auth layer lives in `apps/api/`.

## Key Files

| File | Role |
|------|------|
| `apps/api/src/lib/auth.ts` | Auth.js configuration: providers, adapter, callbacks |
| `apps/api/src/lib/auth.types.ts` | Augmented session/user types |
| `apps/api/src/db/auth-adapter.ts` | Custom Drizzle adapter implementing Auth.js DB interface |
| `apps/api/src/adapters/auth/jwt-token-service.ts` | `TokenService` — sign/verify JWTs |
| `apps/api/src/adapters/auth/argon2-password-service.ts` | `PasswordService` — hash/verify passwords |
| `apps/api/src/use-cases/auth/authenticate.ts` | Application use-case orchestrating auth flow |
| `packages/schema/src/entities/auth.ts` | Zod schemas for Auth.js tables (Session, Account, …) |

## Auth Flow

```
Client POST /api/auth/signin
        │
        ▼
  Auth.js handler (lib/auth.ts)
        │  calls DrizzleAdapter to look up user
        │  calls PasswordService.verify()
        ▼
  Session cookie issued (HTTP-only, SameSite=Lax)
        │
        ▼
  Subsequent requests: Auth.js reads session cookie
  and injects session into GraphQL context
```

## Password Hashing

- Algorithm: **Argon2id** via the `argon2` npm package.
- Adapter: `apps/api/src/adapters/auth/argon2-password-service.ts` implements `PasswordService`.
- Passwords are never stored in plaintext; the hash is stored in the `user.passwordHash` column.

```ts
// PasswordService port (packages/core/src/services/password.service.ts)
interface PasswordService {
  hash(params: HashParams): ResultAsync<string, AppError>;
  verify(params: VerifyParams): ResultAsync<boolean, AppError>;
}
```

## JWT Token Service

- Library: **jose** (JOSE standard, browser + Node compatible).
- Algorithm: **HS256** using `AUTH_SECRET` from env.
- Used for stateless token exchange where session cookies are insufficient.

```ts
// TokenService port (packages/core/src/services/token.service.ts)
interface TokenService {
  sign(params: SignParams): ResultAsync<string, AppError>;
  verify(params: VerifyParams): ResultAsync<TokenPayload, AppError>;
}
```

## DrizzleAdapter

`apps/api/src/db/auth-adapter.ts` maps Auth.js DB operations to Drizzle ORM queries
against the SQLite schema defined in `apps/api/src/db/schema.ts`.

Auth.js tables (managed by the adapter):
- `user` — accounts registered in the system
- `session` — active sessions
- `account` — OAuth provider links (future use)
- `verificationToken` — email verification tokens

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Always | Minimum 32 chars. Used to sign sessions and JWTs. |
| `AUTH_URL` | Always | Base URL of the API (e.g. `http://localhost:4000`). |
| `DATABASE_URL` | Always | Path to SQLite file or LibSQL URL. |
| `TURSO_DATABASE_URL` | Production | Turso remote database URL. |
| `TURSO_AUTH_TOKEN` | Production | Turso authentication token. |

Validated at startup by `packages/config-env/src/schema.ts`.
