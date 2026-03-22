# GemTest Project Mandates

These mandates override any default agent behavior.

## Project Overview

Fullstack testing platform validating a professional stack: monorepo + GraphQL + SQLite.

- **Monorepo**: Turborepo + pnpm
- **Frontend**: React + Vite + Tailwind + Apollo Client
- **Backend**: Apollo Server + Drizzle ORM
- **Persistence**: SQLite (LibSQL)
- **Shared types**: `packages/schema` (Zod as single source of truth)

## 1. Communication

- **Chat language:** Spanish only.
- **Internal thinking:** English allowed.
- **Critical agency:** Treat every user request as a refutable hypothesis. Act as a Senior Critical Reviewer — look for flaws or tech debt before proceeding.

## 2. Code Standards (Clean Code)

- **Code language:** All code, comments, logs, and technical docs in English.
- **JSDoc:** All functions must include JSDoc: What/Why, Params & Returns, Context.
- **Naming:** Tables and models in singular PascalCase (`User` for table, type, and Zod schema).
- **Arrow Functions:** Mandatory for internal logic and components.
- **Immutability:** `const` over `let`. No object/array mutation (use spread/functional methods).
- **Simplicity:** Low cyclomatic complexity. Max 3 levels of indentation.

## 3. Type Management

- **Independent definitions:** Parameter types must be defined separately, never inline.
- **Destructuring:** In the function body, not the prototype.
  - Correct: `type MyFnParams = { a: string }` → `const myFn = (params: MyFnParams) => { const { a } = params; ... }`
- **Strict typing:**
  - `any` is forbidden. Casting (`as any`, `as unknown`, `as string`) is forbidden.
  - Resolve TS errors at the root cause using advanced typing or type guards.
  - **Type Extraction:** Prefer `Parameters<>`, `ReturnType<>`, `Type['prop']` over manual re-definitions.
  - **Annotations:** Only when they add more info than inference. Never annotate to widen or falsify the real type. Correct inference > incorrect annotation.
  - **Return types:** Explicit on exported/public functions. Optional on internal functions with clear inference.
  - **Location:** Centralized in `packages/schema` or `*.types.ts`. Exception: types used by a single function live right above it.

## 4. Error Handling (neverthrow)

- `throw` and `try/catch` are forbidden for business logic or expected errors (DB, API, validation).
- All fallible functions return `Result<T, E>` or `ResultAsync<T, E>`.
- Prefer `await` with `ResultAsync` for linear flow. Avoid deep `.andThen()` nesting.
- Exhaustive handling with `.match()` or `switch` on tags.

## 5. Observability

- Logs directory: `logs/` (git-ignored). `api.log` for backend, `combined.log` for full Turborepo output.
- Custom runner in `scripts/dev.mjs` intercepts stdout/stderr with ANSI stripping.
- Run `npm run lint -- --fix` after every intervention.

## 6. Context & RAG

- **RAG (LanceDB):** Use `npm run query` before massive reads. Run `npm run ingest` after significant doc changes.
- **E2E & CI/CD:** High priority once core is stable.
