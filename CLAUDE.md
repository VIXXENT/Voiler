# Voiler -- AI-First Fullstack Boilerplate

Voiler is a monorepo boilerplate for web applications optimized for AI-agent-driven development. It follows hexagonal architecture with strict TypeScript, neverthrow-based error handling, and zero-tolerance for `any` or `throw`. All code, comments, logs, and docs are in English; chat with the developer is in Spanish only.

## Stack

| Layer      | Technology                                |
| ---------- | ----------------------------------------- |
| Frontend   | TanStack Start (SSR + SPA hybrid)         |
| API        | tRPC + Hono                               |
| Auth       | Better Auth (admin plugin, impersonation) |
| ORM        | Drizzle (pg-core)                         |
| DB         | PostgreSQL (all envs, dev via Docker)     |
| Validation | Zod (single source of truth)              |
| Errors     | neverthrow (Result/ResultAsync)           |
| i18n       | Paraglide JS (compile-time)               |
| Monorepo   | Turborepo + pnpm                          |
| Tests      | Vitest (unit) + Playwright (E2E)          |
| Format     | Prettier                                  |
| UI         | Tailwind CSS + shadcn/ui                  |

## Detail Docs

| Document                 | Topic                                           |
| ------------------------ | ----------------------------------------------- |
| [docs/architecture.md]   | Hexagonal layers, packages, data flow, DI rules |
| [docs/code-standards.md] | All coding mandates with examples               |
| [docs/error-handling.md] | neverthrow patterns, DomainError, AppError      |
| [docs/auth.md]           | Better Auth, sessions, OAuth, impersonation     |
| [docs/testing.md]        | Vitest, Playwright, TDD workflow                |
| [docs/observability.md]  | Structured logging, audit log, health check     |
| [docs/project-mgmt.md]   | GitHub Issues, labels, PR and review process    |

Historical specs and plans live in `docs/superpowers/`.

## Critical Mandates (Summary)

- **No semicolons** -- see [docs/code-standards.md]
- **Trust TS inference** -- annotate only pre-validation objects; see [docs/code-standards.md]
- **Arrow functions only**, max 1 param (wrap in object) -- see [docs/code-standards.md]
- **`const` over `let`**, no mutation -- see [docs/code-standards.md]
- **`any` / `as` casting forbidden** -- see [docs/code-standards.md]
- **`throw`/`try-catch` forbidden** for business logic -- see [docs/error-handling.md]
- **neverthrow `Result`/`ResultAsync`** for all fallible functions -- see [docs/error-handling.md]
- **Hexagonal architecture** -- domain has zero infra imports -- see [docs/architecture.md]
- **JSDoc** on all exported functions -- see [docs/code-standards.md]
- **Chat in Spanish**, code in English -- see [docs/code-standards.md]

## Planning Workflow

Two global skills gate the path from idea to plan. Use them in order.

1. **New web project or high-level idea?** Invoke `product-discovery` (`~/.claude/skills/product-discovery/`) first. Runs problem framing, JTBD, deep competitive research, a Competitive Gate (10x Rule + Porter -- PROCEED / PIVOT / EXTEND / KILL), value proposition, hypothesis mapping, commercial-viability check (always evaluated), and a Lean Canvas coherence check.
2. **Feature on the existing codebase** (or handoff from `product-discovery`): invoke `product-ideation` (`~/.claude/skills/product-ideation/`). Runs Review Gate (KILL / SKIP / SHRINK), 7-dimension feasibility, and **boilerplate curation** (decides which new pieces belong in Voiler vs. the specific app).
3. **Only after both skills complete**, hand off to `superpowers:writing-plans`. If boilerplate curation produced boilerplate-worthy pieces, emit two plans (app + boilerplate).

- **Architectural decisions**: capture each as an ADR under `docs/adr/` using `0000-template.md`. One file per decision, numbered sequentially. If a decision affects both the app and the boilerplate, emit one ADR per context.
- **Skill utility review**: reassess both skills after 30 days using the signals documented in each file.

## Setup

```bash
cp .env.example .env           # Copy env template (edit AUTH_SECRET)
docker compose up db -d        # Start PostgreSQL
pnpm install                   # Install dependencies
pnpm --filter @voiler/api db:push  # Push schema to DB
```

## Commands

```bash
docker compose up db -d            # Start PostgreSQL
pnpm --filter @voiler/api dev      # API dev server (port 4000)
pnpm lint                          # ESLint strict
pnpm format:check                  # Prettier check
pnpm typecheck                     # tsc --noEmit all packages
pnpm test                          # Vitest unit tests
pnpm test:e2e                      # Playwright E2E (needs dev server)
pnpm preview                       # Build + Docker (prod-like)
```

## Verification (after every task)

1. `pnpm lint` -- 0 errors
2. `pnpm typecheck` -- 0 errors
3. `pnpm test` -- all passing
4. `pnpm format:check` -- all files formatted
5. E2E tests if runtime code changed (requires dev server)
