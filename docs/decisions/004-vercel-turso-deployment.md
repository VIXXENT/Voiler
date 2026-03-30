# ADR-004: Vercel + Turso for Deployment

**Status:** Accepted
**Date:** 2025-03

## Context

GemTest is a full-stack monorepo (React frontend + Apollo Server backend) that needs
a production deployment target. Key requirements:

- **Zero operational burden** — no servers to manage.
- **SQLite in production** — the stack is built on Drizzle + LibSQL; the deployment
  target must support a persistent, remote SQLite-compatible database.
- **Monorepo support** — frontend and backend are in the same repo; deployment should
  handle both.
- **No vendor lock-in** — infrastructure choices should be replaceable without rewriting
  application code.

Alternatives considered:

| Option | Notes |
|--------|-------|
| AWS (EC2/RDS) | Full control; high operational cost; PostgreSQL migration required |
| Railway | Supports Node + Postgres; no native SQLite |
| Fly.io | Supports SQLite via LiteFS; more ops complexity than needed |
| **Vercel + Turso** | Serverless; native LibSQL; Turborepo integration; generous free tier |

## Decision

Deploy to **Vercel** (frontend + API serverless functions) with **Turso** as the
managed LibSQL (SQLite-compatible) database.

- Frontend (`apps/web`): Vercel static site / Edge deployment.
- Backend (`apps/api`): Vercel Serverless Functions wrapping Apollo Server.
- Database: Turso cloud SQLite via `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`.

Local and test environments use file-based SQLite (`DATABASE_URL=file:./local.db` or
`file::memory:` for tests). No code changes needed to switch — only env vars differ.

## Consequences

**Positive:**
- Zero infrastructure to manage; Vercel handles scaling and TLS.
- Turso is wire-compatible with LibSQL — the same Drizzle ORM code runs locally and
  in production.
- Turborepo's Vercel integration caches build artifacts automatically.
- Free tier covers development and early production traffic.
- Replacing either Vercel or Turso requires only env-var changes and a new adapter,
  not application rewrites.

**Negative:**
- Vercel Serverless Functions have a cold-start penalty.
- Turso free tier limits concurrent connections and storage.
- The API must be stateless (no in-memory caching between requests) because
  serverless functions do not share memory.

**Mitigations:**
- Apollo Server is stateless by design (no in-memory session store).
- `ProductionEnvSchema` (in `packages/config-env`) validates that `TURSO_DATABASE_URL`
  and `TURSO_AUTH_TOKEN` are present at startup in production, failing fast if missing.
- Local development uses file SQLite, so developers do not need a Turso account.
