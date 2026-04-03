# ADR-001: Hexagonal Architecture

**Status:** Accepted
**Date:** 2026-04-03

## Context

Voiler is an AI-first boilerplate intended to serve as a foundation for multiple web
applications. The architecture needs to support swapping infrastructure dependencies
(database, auth, email, cache) without touching business logic. It also needs to be
testable in isolation, without spinning up a database or HTTP server.

The primary concern is preventing business logic from being entangled with infrastructure.
In most Express/Next.js codebases, database calls, HTTP logic, and domain rules end up
in the same function. This makes testing hard, migration expensive, and AI agents likely
to introduce hidden coupling when generating code.

## Decision

We adopt Hexagonal Architecture (Ports and Adapters) as the structural pattern.

- `packages/domain` contains entities, value objects, and port interfaces. Zero imports
  from infrastructure packages.
- `packages/core` contains use cases that depend only on port interfaces.
- Concrete adapters (Drizzle repositories, Hono routes, Better Auth) live in
  `apps/api/src/adapters/`.
- `apps/api/src/container.ts` is the only file that wires concrete adapters to port
  interfaces. This is the composition root.
- tRPC routers are thin: they parse input, call a use case, and return the result.

This enforces a strict dependency rule: inner layers never import outer layers.

## Alternatives Considered

**Layered Architecture (Controller → Service → Repository)**
The traditional three-layer model is simpler to understand but does not enforce
infrastructure isolation. Services commonly import ORM models directly, making
unit testing require mocking heavy dependencies.

**Clean Architecture (Uncle Bob)**
Clean Architecture and Hexagonal are closely related. Clean Architecture adds
explicit "Use Case Interactor" and "Presenter" concepts that introduce boilerplate
without tangible benefit for a JSON API. Hexagonal achieves the same isolation
with fewer layers.

**No explicit architecture**
Feature-folder organization with no enforced boundaries. Fast to start but
degrades rapidly as the codebase grows. Not suitable for a boilerplate intended
to stay maintainable across plans.

## Consequences

**Positive:**

- Domain and use case logic can be unit-tested without a database.
- Infrastructure can be swapped (e.g., Drizzle → Prisma, PostgreSQL → SQLite for
  tests) by changing only the adapter and the composition root.
- AI agents have clear rules about where new code belongs, reducing accidental
  coupling.
- Port interfaces serve as documentation of what each use case requires.

**Negative:**

- More files and indirection than a simple layered approach.
- New contributors (or agents) must understand the port/adapter pattern before
  contributing correctly.
- Boilerplate for simple CRUD operations can feel excessive.
