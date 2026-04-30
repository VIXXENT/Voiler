# ADR-0002: Analytics port with PostHog adapter from day 1

**Status:** Accepted
**Date:** 2026-04-19
**Deciders:** VIXXENT (via product-ideation, fake-money pilot app)

## Context

Voiler has no analytics primitive. Apps built on the boilerplate need funnels and retention measurement from launch to iterate on UX during the critical pre-PMF window. A self-rolled events table is possible but slow to analyze and blocks rapid UX iteration. Managed analytics ships funnels, cohorts, and optional session recording immediately, with a generous free tier.

## Decision

Add an `Analytics` port to `packages/core` and a default `PostHogAdapter` in `apps/api` consuming the PostHog free tier (EU region by default for GDPR posture). Apps emit typed events; the adapter owns transport, batching, and failure handling.

## Alternatives Considered

- **In-house events table with SQL queries** — no external dependency, full data sovereignty. Rejected: slow iteration cycle, no session recording, blocks UX learning in the first weeks post-launch where most product decisions live.
- **Plausible / Umami** — privacy-friendly, simple. Rejected: funnels and cohorts are not deep enough to debug conversion drop-offs; no session recording.
- **Segment with multiple sinks** — vendor-neutral routing. Rejected: overkill for boilerplate default, adds cost and complexity.

## Consequences

### Positive

- Funnels, cohorts, retention, and session recording available immediately for pre-PMF UX iteration
- PostHog free tier covers 1 M events/month — enough for MVP traffic
- EU region selectable for GDPR posture
- Port is vendor-neutral; migration to self-hosted PostHog or to a different provider is an adapter change

### Negative

- External dependency with a free-tier ceiling; traffic must be monitored to avoid sudden cost
- Data-residency trade-off (mitigated: EU region + data-processing agreement)
- Adds one runtime dependency (`posthog-node`, `posthog-js`)

### Neutral

- Apps can bypass the adapter and emit custom events when a dashboard gap appears, without breaking the port contract

## Compliance with Voiler mandates

- **Hexagonal layering:** `Analytics` port in `packages/core`; adapter in `apps/api/src/adapters/analytics/`. Typed event schemas live in `packages/schema` as Zod objects.
- **neverthrow error handling:** `Analytics.track` returns `ResultAsync<void, AnalyticsError>`. Transport errors and rate-limit responses are typed; nothing throws.
- **No `any` / strict types:** event payloads are discriminated unions; the port enforces the schema at the boundary.
- **TDD:** Vitest unit tests cover batching, rate-limit backoff, and payload serialization using a fake transport. No network calls in tests. No E2E at the boilerplate layer.

## References

- Related PRD or GitHub issue: fake-money Plan B, Oleada 1
- Related PRs: TBD
- External docs: PostHog JS/Node SDK (https://posthog.com/docs/libraries)
