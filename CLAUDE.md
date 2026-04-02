# Voiler — AI-First Fullstack Boilerplate

Monorepo boilerplate for web applications (with or without frontend), optimized for AI-agent-driven development.

## Stack

| Layer      | Technology                                     |
| ---------- | ---------------------------------------------- |
| Frontend   | TanStack Start (SSR + SPA hybrid)              |
| API        | tRPC + Hono                                    |
| Auth       | Better Auth (plugins: sessions, impersonation) |
| ORM        | Drizzle (pg-core)                              |
| DB         | PostgreSQL (all envs, dev via Docker)          |
| Validation | Zod (single source of truth)                   |
| Errors     | neverthrow (Result/ResultAsync)                |
| i18n       | Paraglide JS (compile-time)                    |
| Monorepo   | Turborepo + pnpm                               |
| Tests      | Vitest (unit) + Playwright (E2E)               |
| Format     | Prettier                                       |
| UI         | Tailwind CSS + shadcn/ui                       |

## Critical Mandates

### Communication

- **Chat language:** Spanish only. Internal thinking: English allowed.
- **Critical agency:** Treat every request as a refutable hypothesis.
- **Code language:** All code, comments, logs, and docs in English.

### Code Quality

- **No semicolons** — project uses no-semicolon style.
- **Trust TS inference** — do NOT annotate types when TS infers correctly. DO annotate when initializing objects destined as function arguments (pre-validation: error points to the wrong property, not the call site).
- **Explicit return types** on exported functions.
- **Max 1 parameter per arrow function** — always wrap in object params.
- **Arrow functions** mandatory for logic and components.
- **`const` over `let`**, no object/array mutation.
- **Trailing commas** in multi-line structures.
- **Line length:** Prettier (`printWidth: 100`) handles formatting. No hard ESLint limit.
- **JSDoc** on all exported functions.

### TypeScript

- `any` is **forbidden**. Casting (`as any`, `as unknown`) is **forbidden**.
- Parameter types defined separately, destructure in body.
- Explicit return types on exported functions.

### Error Handling

- `throw`/`try-catch` **forbidden** for business logic.
- All fallible functions return `Result<T, E>` or `ResultAsync<T, E>`.
- Exhaustive handling with `.match()` or `switch` on tags.

### Architecture (Hexagonal)

- Domain layer has zero infrastructure imports.
- Use cases depend only on port interfaces.
- tRPC routers are thin: parse input → call use case → return result.
- `container.ts` is the ONLY file importing concrete adapters.

## Documents

| File                                                             | Read when...                                  |
| ---------------------------------------------------------------- | --------------------------------------------- |
| `docs/superpowers/specs/2026-03-30-voiler-boilerplate-design.md` | Understanding overall design and decisions    |
| `docs/superpowers/specs/2026-03-31-security-hardening-plan.md`   | Implementing security measures                |
| `docs/superpowers/plans/2026-03-31-voiler-overview.md`           | Understanding plan contracts and dependencies |
| `docs/superpowers/plans/2026-03-31-plan-a-foundation.md`         | Plan A reference (COMPLETED 2026-04-01)       |

## Setup

```bash
cp .env.example .env           # Copy env template (edit AUTH_SECRET)
docker compose up db -d        # Start PostgreSQL
pnpm install                   # Install dependencies
pnpm --filter @voiler/api db:push  # Push schema to DB
```

## Commands

```bash
docker compose up db -d        # Start PostgreSQL
pnpm --filter @voiler/api dev # Start API (hot reload, port 4000)
pnpm lint                      # ESLint strict
pnpm format:check              # Prettier check
pnpm typecheck                 # tsc --noEmit all packages
pnpm test                      # Vitest unit tests
pnpm test:e2e                  # Playwright E2E (requires dev server)
pnpm preview                   # Build + run in Docker (prod-like)
```

## Verification (after every task)

Always run after completing a task:

1. `pnpm lint` — 0 errors
2. `pnpm typecheck` — 0 errors
3. `pnpm test` — all passing
4. `pnpm format:check` — all files formatted
5. E2E tests if runtime code changed (requires dev server)
