# @gemtest/schema

Single Source of Truth for all monorepo models. Zod for runtime validation + type inference.

## Structure

- `src/entities/` — Business model schemas (e.g. `UserSchema`).
- `src/adapters/` — Schema transformers (e.g. `zodToSqliteTable` for Drizzle SQLite).

## SQLite Adapter

- `zodToSqliteTable`: Transforms Zod objects into Drizzle table definitions.
- Supports overrides for Primary Keys, Auto-increment, Unique.
- Uses `SqliteTableColumns` extracted from Drizzle for full compatibility without `any`.
- Maps complex types (ZodDate → timestamp, etc.) for SQLite.
