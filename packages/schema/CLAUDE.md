# @gemtest/schema

Zod-first schema package — single source of truth for all monorepo models.

## Purpose

Defines every persistent entity and API contract as a Zod schema.
All TypeScript types are inferred from Zod — never hand-written duplicates.
Also provides the `zodToSqliteTable` adapter that bridges Zod schemas to Drizzle table definitions,
keeping the DB schema in sync with the domain model automatically.

## Source layout

```
src/
  entities/
    user.ts                # UserSchema — full DB model (id, name, email, password, role, …)
    auth.ts                # AccountSchema, SessionSchema, VerificationTokenSchema (Auth.js tables)
  adapters/
    sqlite.ts              # zodToSqliteTable — converts Zod objects to Drizzle SQLite table defs
    sqlite.test.ts         # Unit tests for the sqlite adapter
  inputs/
    create-user.ts         # CreateUserInput schema (name, email, password)
    login.ts               # LoginInput schema (email, password)
    update-user.ts         # UpdateUserInput schema (partial fields)
  outputs/
    public-user.ts         # PublicUserSchema — UserSchema.pick() of safe-to-expose fields
    auth-response.ts       # AuthResponseSchema — { token, user: PublicUser }
  index.ts                 # Barrel re-exports
```

## Key conventions

- `UserSchema` is the canonical DB model. `PublicUserSchema` is derived via `.pick()` — never defined independently.
- Input schemas use `.pick()` or `.omit()` from entity schemas to stay in sync.
- All exported types are inferred: `export type Foo = z.infer<typeof FooSchema>`.
- `zodToSqliteTable` uses `SqliteTableColumns` from Drizzle internals — no `any` casts.

## Dependencies

**External:**
- `zod` — schema definition and type inference
- `drizzle-orm` — Drizzle column type utilities (for sqlite adapter)

## Rules

- Never define TypeScript types manually — always `z.infer<typeof Schema>`.
- `UserSchema` is the single source of truth; all other user-related schemas derive from it.
- No business logic here — only schema definitions and the sqlite adapter.
- `zodToSqliteTable` must support column overrides (PK, autoincrement, unique) without `any`.
- See root CLAUDE.md for global coding standards.
