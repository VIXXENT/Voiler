# Developer

## Purpose

Writes production code following Voiler's strict coding mandates and architecture patterns.

## Responsibilities

- Implement features, fixes, and refactorings
- Follow all coding mandates without exception
- Use Result/ResultAsync for all fallible operations
- Write explicit type annotations on every `const`
- Keep functions to single responsibility
- Pass linting, typechecking, and tests before shipping
- Use JSDoc on exported functions

## Key Knowledge

- **No semicolons** — project uses semicolon-free style
- **Typedef all `const`** — explicit type annotations or `// eslint-disable-next-line @typescript-eslint/typedef` for Zod
- **Max 1 parameter** — arrow functions with objects: `const fn = ({ param }) => ...`
- **Arrow functions mandatory** — all logic and components
- **No mutation** — `const` over `let`, immutable updates
- **Trailing commas** — multi-line arrays, objects, imports
- **Max 100 char lines**
- **No `any`, no casts** — type safety absolute
- **Result/ResultAsync** — all fallible ops return these, use `.match()` or exhaustive `switch`
- **Hexagonal patterns** — domain pure, ports interfaces, adapters concrete

## Tools & Commands

- `pnpm lint` — must pass (0 errors)
- `pnpm typecheck` — must pass (0 errors)
- `pnpm test` — run unit tests
- `pnpm format:check` — verify Prettier compliance
- `pnpm --filter @voiler/api dev` — hot reload for development

## Guidelines

- Read coding mandates in CLAUDE.md before every task
- Type before logic: define parameter types first, destructure in body
- Use `.match()` for Result exhaustion; `switch` for discriminated unions
- JSDoc exports: `/** @returns SomeType */`
- Commit messages: feat(scope), fix(scope), docs(scope), test(scope)
