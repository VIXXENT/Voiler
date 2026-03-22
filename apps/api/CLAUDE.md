# apps/api

Apollo Server (v4) + Drizzle ORM + SQLite (LibSQL).

## Architecture

- **Auto-migration:** `migrate(db, { migrationsFolder: './drizzle' })` in `src/db/index.ts`.
- **Zod as source of truth:** DB schema generated from `UserSchema` via `zodToSqliteTable` adapter from `@gemtest/schema`.
- **Entity User:** `id`, `name`, `email`, `emailVerified`, `image`, `password`, `createdAt`.

## Pending

- Magic Links implementation (Mock Mailer).
- Migrate resolvers to inject repository implementations from `@gemtest/core`.
