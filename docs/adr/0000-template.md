# ADR-0000: Template

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
**Date:** YYYY-MM-DD
**Deciders:**

## Context

What situation forces a decision? What constraints apply (stack, timeline, team, compliance, user need)?

## Decision

State the chosen option in one sentence, then elaborate the rationale.

## Alternatives Considered

- **Option A** — description, pros, cons, why rejected
- **Option B** — description, pros, cons, why rejected

## Consequences

### Positive

-

### Negative

-

### Neutral

-

## Compliance with Voiler mandates

- **Hexagonal layering:** how this decision respects or extends the boundary between domain and infrastructure
- **neverthrow error handling:** impact on the `Result` / `ResultAsync` flow; any new `DomainError` or `AppError` variants
- **No `any` / strict types:** types introduced and the validation boundary (Zod schema) that guards them
- **TDD:** test approach (unit in Vitest, E2E in Playwright), minimum coverage, edge cases

## References

- Related PRD or GitHub issue:
- Related PRs:
- External docs:
