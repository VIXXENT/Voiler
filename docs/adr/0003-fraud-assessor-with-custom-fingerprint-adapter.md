# ADR-0003: FraudAssessor port with custom fingerprint adapter (no external vendor)

**Status:** Accepted
**Date:** 2026-04-19
**Deciders:** VIXXENT (via product-ideation, fake-money pilot app)

## Context

Anti-fraud is a recurring cross-project requirement. Commercial vendors (FingerprintJS and similar) ship a strong baseline but lock apps to a service and a signal set that attackers already understand. A custom, composable signal layer is weaker on day 1 but gives Voiler-based apps the freedom to evolve differentiated signals (canvas-texture noise, timing, sensor data, novel entropy sources). For the boilerplate, the extractable piece is the port plus a minimal default adapter; scoring policy stays per app because it is inherently product-specific.

## Decision

Add a `FraudAssessor` port to `packages/core`, a `FraudSignal` value object, a `fraud_signals` table scaffold in `packages/schema`, and a default `CustomFingerprintAdapter` in `apps/api`. The default adapter captures IP, a `ua-parser-js` digest, a canvas hash, and a WebGL hash. Scoring policy (weights, thresholds, action rules) is implemented inside each consuming app.

## Alternatives Considered

- **FingerprintJS Pro / free** — strong signal, minimal integration. Rejected: external dependency, known signal surface, vendor lock. Apps that need commercial-grade signal can still add a `FingerprintJsAdapter` behind the same port.
- **No fingerprint layer in boilerplate** — simplest. Rejected: every app ends up reinventing the same primitive; boilerplate loses value as an accelerator.

## Consequences

### Positive

- Zero external dependency; no vendor lock on the default adapter
- Signal surface is controllable and extensible; apps can innovate on novel signals without migrating infrastructure
- Port is vendor-neutral; commercial adapters (`FingerprintJsAdapter`) can coexist

### Negative

- Initial signal strength is lower than commercial vendors; apps shoulder the maintenance cost of signal quality
- Scoring policy left to apps means the boilerplate cannot prevent a per-app policy that is too permissive

### Neutral

- `fraud_signals` scaffold is opt-in via migration; apps that never call the assessor do not materialize the table

## Compliance with Voiler mandates

- **Hexagonal layering:** `FraudAssessor` port in `packages/core`; default adapter in `apps/api/src/adapters/fraud/`. Policy (scoring, thresholds, actions) sits in the consuming app's domain, not the boilerplate.
- **neverthrow error handling:** `FraudAssessor.assess` returns `ResultAsync<FraudAssessment, FraudError>`. Adapter-level failures (missing canvas, WebGL blocked) are typed partial assessments, not exceptions.
- **No `any` / strict types:** `FraudSignal` is a discriminated union over signal kinds; confidence fields are bounded numerics validated via Zod.
- **TDD:** Vitest unit tests cover signal capture, deterministic-hash reproducibility, and graceful degradation when a signal source is unavailable. No browser-dependent assertions.

## References

- Related PRD or GitHub issue: fake-money Plan B, Oleada 2
- Related PRs: TBD
- External docs: `ua-parser-js`, canvas-fingerprinting literature
