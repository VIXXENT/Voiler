# ADR-0001: Scheduler port with in-process Croner adapter as default

**Status:** Accepted
**Date:** 2026-04-19
**Deciders:** VIXXENT (via product-ideation, fake-money pilot app)

## Context

Voiler currently exposes no primitive for periodic or background jobs. Apps built on top of the boilerplate, starting with fake-money, require cron-style workflows (periodic allowance grants, cleanup tasks, notification fan-out). External managed solutions (Inngest, Trigger.dev, Temporal) introduce runtime dependencies, vendor lock, and pre-PMF operational cost. A minimal port plus an in-process default adapter keeps the boilerplate self-contained while leaving the migration path open.

## Decision

Add a `Scheduler` port to `packages/core` and a default `CronerAdapter` in `apps/api` built on the `croner` library and PostgreSQL advisory locks for single-writer guarantees. Apps consume the port; the adapter is swappable without domain changes.

The MVP invariant "one scheduler writer per deployment" is documented at the adapter layer. When apps outgrow single-instance topology, a managed adapter (Inngest/Trigger.dev) replaces the default without touching domain code.

## Alternatives Considered

- **Inngest from day 1** — hosted reliability, retries, dashboard. Rejected: external dependency, vendor lock, not needed pre-PMF, couples the boilerplate to a commercial service.
- **Trigger.dev** — same shape as Inngest, same trade-offs.
- **Temporal** — rigorous workflow engine. Rejected: operational footprint is wrong-sized for boilerplate.
- **node-cron / `setInterval` with no lock** — trivial. Rejected: silent duplication if more than one instance runs the scheduler, no observability.

## Consequences

### Positive

- Zero new external dependencies; stays within the self-contained boilerplate ethos
- Hexagonal clean separation: port in `packages/core`, adapter in `apps/api`
- Fast to implement (~1-2 days with tests) and cheap to run
- Swappable: managed adapters can be added behind the same port

### Negative

- Invariant "one scheduler writer per deployment" must be documented and enforced
- Observability limited to structured logs until a managed adapter lands
- PostgreSQL advisory locks tie scheduler liveness to DB liveness (acceptable: if DB is down, jobs cannot persist effects anyway)

### Neutral

- Apps that need multi-instance or advanced workflows replace the adapter (~1-day effort)
- `croner` is MIT, ~5 KB, actively maintained

## Compliance with Voiler mandates

- **Hexagonal layering:** `Scheduler` port in `packages/core`; adapter in `apps/api/src/adapters/scheduler/`. Domain emits `ScheduledJobDefinition` value objects; infrastructure knowledge stays out of domain.
- **neverthrow error handling:** `Scheduler.register` and `Scheduler.start` return `Result<void, SchedulerError>`. New `SchedulerError` variant added to the `AppError` union in `packages/core`.
- **No `any` / strict types:** cron expression and jitter validated at the adapter boundary via Zod; job payloads are typed generics at the port level.
- **TDD:** Vitest unit tests cover advisory-lock contention, cron expression parsing, error paths, and adapter lifecycle. No E2E coverage required at the boilerplate layer; apps add E2E around their own scheduled flows.

## References

- Related PRD or GitHub issue: fake-money Plan B, Oleada 1
- Related PRs: TBD
- External docs: `croner` (https://github.com/hexagon/croner), PostgreSQL advisory locks (https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)
