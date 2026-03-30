# ADR-001: Hexagonal Architecture

**Status:** Accepted
**Date:** 2025-03

## Context

GemTest needs a backend architecture that:
- Keeps business rules completely independent of infrastructure choices (DB, auth provider).
- Allows swapping out adapters (e.g., SQLite → PostgreSQL) without touching use-cases.
- Makes domain logic unit-testable without spinning up a database or HTTP server.
- Provides clear boundaries that multiple agents can work on in parallel without conflicts.

The primary alternatives considered were:

| Style | Description |
|-------|-------------|
| Classic Layered (MVC) | Controller → Service → Repository. Simple but tightly couples services to concrete repos. |
| Clean Architecture | Concentric rings with Dependency Rule. Similar to Hexagonal but more prescriptive ceremony. |
| Hexagonal (Ports & Adapters) | Domain + Ports in the center; Adapters on the outside. Dependency always points inward. |

## Decision

Adopt **Hexagonal Architecture** with:
- `packages/domain` — pure domain entities, value-objects, and `DomainError`.
- `packages/core` — port interfaces (repository contracts, service contracts) and `AppError`.
- `apps/api/src/use-cases/` — application orchestration layer.
- `apps/api/src/adapters/` — concrete secondary adapters (Drizzle, Argon2, jose, MockEmail).
- `apps/api/src/graphql/` — primary adapters (GraphQL resolvers).

## Consequences

**Positive:**
- Domain code has zero infrastructure imports; fully unit-testable with mocks.
- Swapping the DB engine means writing a new adapter, not touching use-cases.
- Clear ownership boundaries enable parallel agent development.
- `packages/core` ports serve as stable contracts between frontend-type work and backend.

**Negative:**
- More files and indirection than a simple MVC structure.
- New contributors must understand the dependency rule before making changes.
- Small CRUD features still require touching 3–4 layers.

**Mitigations:**
- `docs/architecture.md` documents the layers with a dependency diagram.
- The composition root (`adapters/index.ts`) is the only file that wires concrete types,
  making the "magic" visible in one place.
