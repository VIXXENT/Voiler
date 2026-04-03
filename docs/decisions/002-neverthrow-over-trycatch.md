# ADR-002: neverthrow Over try/catch

**Status:** Accepted
**Date:** 2026-04-03

## Context

Error handling in TypeScript is invisible by default. A function that throws is
indistinguishable from one that does not at the call site. This means callers have
no compile-time signal that an error path exists, and errors routinely propagate
unhandled until they reach a generic top-level handler.

For a boilerplate that emphasizes correctness and AI-agent-driven development, we need
error handling that is:

1. Explicit in the type signature — callers must acknowledge error cases.
2. Exhaustive — the compiler should flag unhandled branches.
3. Composable — multiple fallible operations should chain without nested try/catch.
4. Readable — business logic should not be buried in exception scaffolding.

## Decision

All fallible functions return `Result<T, E>` or `ResultAsync<T, E>` from
[neverthrow](https://github.com/supermacro/neverthrow).

- `throw` and `try/catch` are forbidden for business logic.
- Errors are modeled as discriminated union types with a `tag` field.
- Results are handled exhaustively using `.match()` or a `switch` on `tag`.
- Use cases that call multiple fallible operations use `.andThen()` and `.mapErr()`
  to compose without nesting.

tRPC routers receive a `Result` from a use case and map it to an appropriate HTTP
response or tRPC error. Error mapping happens at the boundary, not inside business
logic.

## Alternatives Considered

**try/catch with custom error classes**
Familiar pattern but errors are invisible in type signatures. TypeScript's `unknown`
catch type requires manual narrowing. Composing multiple fallible calls produces
deeply nested or early-return code that is easy to get wrong.

**Effect-TS**
Effect provides a more powerful functional runtime (fibers, dependency injection,
tracing). However, it introduces a steep learning curve, a large runtime, and
requires adopting a distinct programming model throughout the codebase. For a
boilerplate with a single-developer team, the complexity-to-benefit ratio is
unfavorable at this stage.

**ts-results**
Similar to neverthrow. neverthrow has better async ergonomics (`ResultAsync`),
broader adoption, and more active maintenance.

**Returning `{ data, error }` tuples**
Simple but not type-narrowing. TypeScript cannot infer that `data` is defined when
`error` is null without explicit discriminated union support.

## Consequences

**Positive:**

- Error paths are visible in function signatures — no hidden control flow.
- The compiler enforces exhaustive handling when using discriminated unions.
- Business logic reads as a pipeline of transformations, not nested try/catch.
- AI agents generating code are forced to model errors explicitly.

**Negative:**

- Developers unfamiliar with Result types face an initial learning curve.
- Third-party libraries throw; adapter code must wrap those calls in `fromThrowable`
  or `ResultAsync.fromPromise`, adding a thin conversion layer at every boundary.
- Stack traces are less automatic; errors must carry context explicitly.
