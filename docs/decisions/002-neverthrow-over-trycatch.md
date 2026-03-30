# ADR-002: neverthrow over try/catch

**Status:** Accepted
**Date:** 2025-03

## Context

Backend functions that interact with databases, external services, or apply business rules
can fail in predictable ways: a user is not found, a password does not match, a DB query
times out. These are **expected failure modes**, not exceptional conditions.

Traditional `try/catch` has several problems in this context:
- Error types are invisible in function signatures — callers do not know what can fail.
- Nothing forces callers to handle errors; they can be silently swallowed.
- Deep `try/catch` nesting increases cyclomatic complexity.
- TypeScript cannot narrow `catch (e)` — `e` is typed as `unknown`.

Alternatives considered:

| Approach | Notes |
|----------|-------|
| `try/catch` everywhere | Poor discoverability; no type safety on errors |
| Custom `Result` tuple (`[T, E]`) | Simple but no helpers (map, andThen, match) |
| `effect-ts` / Effect | Full ecosystem but steep learning curve; overkill for this scale |
| `neverthrow` | Lightweight. `Result<T, E>` + `ResultAsync<T, E>`. Works with any error union. |

## Decision

Use **neverthrow** (`Result<T, E>` and `ResultAsync<T, E>`) for all fallible functions.

Rules enforced by this decision:
- `throw` and `try/catch` are **forbidden** for business logic or expected errors.
- Infrastructure adapters wrap `Promise` rejections with `fromPromise`/`fromThrowable`.
- Errors are **tagged unions** (discriminated unions with a `tag` string field).
- Exhaustive handling at adapter boundaries (GraphQL resolvers) via `.match()` or `switch`.

## Consequences

**Positive:**
- Function signatures are self-documenting: `ResultAsync<User, AppError>` tells callers
  exactly what can succeed and what can fail.
- TypeScript exhaustiveness checking prevents unhandled error tags.
- Linear async flow using `await` + `isErr()` checks — no deep `.andThen()` nesting.
- Errors are values — they can be logged, transformed, and passed up without losing shape.

**Negative:**
- `neverthrow` is not idiomatic JavaScript/TypeScript — new developers must learn the pattern.
- Wrapping every async call adds a small amount of boilerplate.
- Third-party libraries that `throw` must be wrapped at the adapter boundary.

**Mitigations:**
- `docs/error-handling.md` provides examples for every common scenario.
- `_docs/error-handling-examples/5-neverthrow.ts` shows before/after comparisons.
