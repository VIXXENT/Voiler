# ADR-0004: Runtime configuration registry with admin-managed form generator

**Status:** Accepted
**Date:** 2026-04-19
**Deciders:** VIXXENT (via product-ideation, fake-money pilot app)

## Context

Apps built on Voiler need to tune behavior post-deploy without redeploying. Environment variables are appropriate for secrets, infrastructure connection strings, and immutable-per-deploy values. Anything else — feature thresholds, rate limits, schedule cron expressions, copy strings, weekly allowances, ceilings, reclaim thresholds, fraud-window durations, A/B traffic splits — belongs in a runtime registry editable by admins. Apps that ship admin UIs should not each reinvent this primitive.

The fake-money pilot app surfaces this need across multiple ADRs (ADR-0003 dotation, ADR-0004 delayed sender count, ADR-0005 discovery surface) — every tunable knob in the product is a configuration entry rather than a constant.

## Decision

Add a `RuntimeConfig` primitive to Voiler with the following shape:

- A typed registry of named settings stored in PostgreSQL (`runtime_config` table)
- Each setting declares: key, section (for UI grouping), label, description, type, default, validation (Zod schema), and whether it is sensitive (masks value in audit log)
- Field types supported in v1: `boolean`, `integer`, `decimal`, `text` (short, length-bounded), `textarea` (long), `select` (enum), `cron_expression`, `duration_days`
- A `RuntimeConfig` port in `packages/core`; a Drizzle-backed adapter in `apps/api` with in-process read-through cache and explicit invalidation on write
- A tRPC namespace (`runtime-config.list`, `runtime-config.set`) gated by `adminProcedure` and audit-logged via the existing `audit_log` table
- A generic admin UI form generator that reads the registry, groups fields by section into tabs, and renders the appropriate input per type (switch / number with ± buttons / text / textarea / select / cron picker / day-count picker)
- Per-field save with both an explicit Save button and a Ctrl+Enter / Cmd+Enter shortcut; optimistic UI with revert on validation failure
- Apps register settings at boot via a fluent builder; unregistered keys are rejected at write time

Multi-instance cache invalidation (PostgreSQL `LISTEN`/`NOTIFY` propagation) is documented as a follow-up and gated on multi-instance topology adoption; single-instance apps need only the in-process cache.

## Alternatives Considered

- **All env vars** — rejected: requires redeploys for tuning, no admin agency, no audit trail of who changed what when.
- **Feature-flag SaaS (LaunchDarkly, Statsig, Unleash)** — rejected: external dependency, free-tier ceilings, overkill for boilerplate-default tuning, additional vendor in the dependency graph.
- **Per-app custom settings tables** — rejected: each app reinvents the dashboard; no shared audit pattern; high regression cost.
- **JSON in a single row** — rejected: typed access becomes harder; partial updates race-prone; admin UI cannot generate inputs without per-key metadata anyway.

## Consequences

### Positive

- Apps tune behavior live; admin UI ships for free with `runtime-config.set` audit events
- Clear separation between env (secrets, deploy-time) and runtime (operational tuning)
- Form generator removes the temptation to hand-roll an admin form per setting
- Foundation for future `RuntimeConfig`-driven A/B and feature-flag use cases inside the same primitive

### Negative

- Surface area for misuse: a misconfigured admin can break app behavior in seconds; validation Zod schemas must be tight, and audit-log review is a recommended ops hygiene step
- In-process cache invalidation is single-instance-safe by default; multi-instance topologies need `LISTEN`/`NOTIFY` (deferred)
- Adds two tables (`runtime_config`, `runtime_config_history` for change log) and a non-trivial admin route

### Neutral

- Sensitive settings are supported but discouraged; secrets should remain in env vars even though the registry can hold them
- Apps using the registry inherit a transitive dependency on the admin role (Better Auth admin plugin, already present in Voiler)

## Compliance with Voiler mandates

- **Hexagonal layering:** `RuntimeConfig` port in `packages/core`; adapter in `apps/api/src/adapters/runtime-config/`; settings schema in `packages/schema`; admin UI components in `packages/ui`.
- **neverthrow error handling:** `RuntimeConfig.get`, `RuntimeConfig.set`, `RuntimeConfig.list` return `Result` / `ResultAsync`. `ValidationError`, `UnknownKey`, `Unauthorized` are typed variants of `RuntimeConfigError` added to the `AppError` union.
- **No `any` / strict types:** each registered setting carries a Zod schema; `get<K>(key: K)` returns the validated type via type-level inference over the registry; no `any` at the boundary.
- **TDD:** unit tests cover registration, validation rejection on bad input, cache read-through and invalidation on write, admin permission gate, audit-log emission. E2E `runtime-config-admin.spec.ts` covers form-generator round trip (load defaults → edit field → save → reload reflects change).

## References

- Q4 calibration in product-ideation session (fake-money 2026-04-19) — hot-configurable values driven all four fake-money tunables
- fake-money ADR-0003 (dotation), ADR-0004 (delayed sender count), ADR-0005 (discovery surface) — all consume `RuntimeConfig`
- Better Auth admin plugin (existing in Voiler) for the admin role gate
