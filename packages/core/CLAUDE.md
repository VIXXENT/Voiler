# @gemtest/core

Repository pattern contracts for data access.

## State

- Interfaces defined: `IRepository<T>`, `IUserRepository`.
- API currently accesses Drizzle/SQLite directly in resolvers (prototyping phase).

## Pending

- Migrate `apps/api` resolvers to inject concrete repository implementations.
