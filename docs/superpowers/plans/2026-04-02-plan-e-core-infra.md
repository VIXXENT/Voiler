# Plan E-Core: Infrastructure (Docker + CI + AI Files)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Docker multi-stage builds for API and web, a full-stack docker-compose, GitHub Actions CI pipeline, and AI agent descriptor files (AGENTS.md, llms.txt).

**Architecture:** Multi-stage Dockerfiles for API (Node + Hono) and web (Node + Vite build + static serve). Docker Compose orchestrates PostgreSQL + API + web for both dev (hot reload) and prod (built images). GitHub Actions CI runs lint, typecheck, and tests on every push/PR. AGENTS.md and llms.txt describe the project for AI agents.

**Tech Stack:** Docker, Docker Compose, GitHub Actions, Node 22 Alpine

---

## File Structure

```
voiler/
  apps/api/Dockerfile              # Multi-stage: build + prod
  apps/web/Dockerfile              # Multi-stage: build + prod (static)
  docker-compose.yml               # MODIFIED: add api + web services
  docker-compose.prod.yml          # Full prod stack
  .dockerignore                    # Exclude node_modules, .git, etc.
  .github/workflows/ci.yml        # Lint + typecheck + test on push/PR
  AGENTS.md                        # AI agent project descriptor
  llms.txt                         # Machine-readable project summary
```

## Coding Standards

- No semicolons
- Trust TS inference (no mandatory typedef)
- Arrow functions, const over let
- Trailing commas in multi-line
- JSDoc on exported functions
- Max 1 param per arrow function (wrap in object)
- Prettier handles line length (printWidth: 100)

---

### Task E-1: Dockerfiles (API + Web)

**Files:**

- Create: `apps/api/Dockerfile`
- Create: `apps/web/Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

```dockerignore
node_modules
.git
.turbo
coverage
dist
.env
*.log
.claude
.vscode
.idea
```

- [ ] **Step 2: Create API Dockerfile**

Multi-stage build using pnpm with monorepo pruning:

```dockerfile
# ── Build stage ──
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Copy workspace config + lockfile first (layer cache)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config-ts/package.json packages/config-ts/package.json
COPY packages/config-env/package.json packages/config-env/package.json
COPY packages/schema/package.json packages/schema/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/core/package.json packages/core/package.json

# Install deps (cached unless lockfile changes)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ packages/
COPY apps/api/ apps/api/
COPY tsconfig.json turbo.json ./

# Build API
RUN pnpm --filter @voiler/api build

# ── Production stage ──
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=builder /app/apps/api/package.json apps/api/package.json
COPY --from=builder /app/packages/config-ts/package.json packages/config-ts/package.json
COPY --from=builder /app/packages/config-env/package.json packages/config-env/package.json
COPY --from=builder /app/packages/schema/package.json packages/schema/package.json
COPY --from=builder /app/packages/domain/package.json packages/domain/package.json
COPY --from=builder /app/packages/core/package.json packages/core/package.json

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/ packages/

EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
```

Note: The API currently uses `tsx` for dev. We need a build step. Check if `apps/api/package.json` has a `build` script. If not, add: `"build": "tsc -p tsconfig.json --outDir dist"`. The tsconfig must have `"outDir": "dist"` and appropriate settings for ESM output.

**Important:** Before implementing, read `apps/api/tsconfig.json` and `apps/api/package.json` to understand the current build setup. The Dockerfile above assumes `pnpm --filter @voiler/api build` produces `apps/api/dist/index.js`. If the build output differs, adjust the `CMD` path.

- [ ] **Step 3: Create Web Dockerfile**

```dockerfile
# ── Build stage ──
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/config-ts/package.json packages/config-ts/package.json
COPY packages/schema/package.json packages/schema/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/core/package.json packages/core/package.json

RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY apps/web/ apps/web/
COPY tsconfig.json turbo.json ./

# Build args for env vars baked into the client bundle
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter @voiler/web build

# ── Production stage ──
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built output — adjust path based on Vite output
COPY --from=builder /app/apps/web/dist ./dist

# Use a lightweight static server
RUN npm install -g serve@14

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

**Important:** Before implementing, read `apps/web/vite.config.ts` to confirm the build output directory. If the web app uses SSR (TanStack Start with Nitro), the production setup will differ — it may need a Node server instead of a static `serve`. Check the actual build output and adjust accordingly.

- [ ] **Step 4: Verify Dockerfiles build**

```bash
# Build API image (from repo root)
docker build -f apps/api/Dockerfile -t voiler-api .

# Build Web image
docker build -f apps/web/Dockerfile -t voiler-web --build-arg VITE_API_URL=http://localhost:4000 .
```

Expected: Both images build successfully. If there are build script issues (missing `build` in package.json, wrong outDir), fix them before proceeding.

- [ ] **Step 5: Commit**

```bash
git add apps/api/Dockerfile apps/web/Dockerfile .dockerignore
git commit -m "feat(infra): add multi-stage Dockerfiles for API and web"
```

---

### Task E-2: Docker Compose Full Stack

**Files:**

- Modify: `docker-compose.yml` (add api + web services for dev)
- Create: `docker-compose.prod.yml` (full prod stack)
- Modify: `package.json` (add `preview` script)

- [ ] **Step 1: Update docker-compose.yml for dev**

Add API and web services with hot reload. Keep the existing `db` service unchanged.

```yaml
services:
  db:
    # ... existing PostgreSQL config (keep as-is)

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
      target: builder
    container_name: voiler-api
    restart: unless-stopped
    ports:
      - '4000:4000'
    environment:
      NODE_ENV: development
      PORT: '4000'
      DATABASE_URL: postgresql://voiler:voiler_dev@db:5432/voiler_dev
      AUTH_SECRET: dev-secret-at-least-32-characters-long-ok
    volumes:
      - ./apps/api/src:/app/apps/api/src
      - ./packages:/app/packages
    command: pnpm --filter @voiler/api dev
    depends_on:
      db:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      target: builder
    container_name: voiler-web
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      VITE_API_URL: http://localhost:4000
    volumes:
      - ./apps/web/src:/app/apps/web/src
    command: pnpm --filter @voiler/web dev -- --host 0.0.0.0
    depends_on:
      - api
```

**Important:** The dev compose uses the `builder` stage as target and mounts source volumes for hot reload. The `command` override runs the dev server instead of the production entrypoint.

- [ ] **Step 2: Create docker-compose.prod.yml**

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: voiler-db-prod
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-voiler}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}
      POSTGRES_DB: ${POSTGRES_DB:-voiler}
    volumes:
      - voiler_pgdata_prod:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-voiler} -d ${POSTGRES_DB:-voiler}']
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: voiler-api-prod
    restart: unless-stopped
    ports:
      - '4000:4000'
    environment:
      NODE_ENV: production
      PORT: '4000'
      DATABASE_URL: postgresql://${POSTGRES_USER:-voiler}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-voiler}
      AUTH_SECRET: ${AUTH_SECRET:?AUTH_SECRET required}
      TRUSTED_ORIGINS: ${TRUSTED_ORIGINS:-}
    depends_on:
      db:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost:4000}
    container_name: voiler-web-prod
    restart: unless-stopped
    ports:
      - '3000:3000'
    depends_on:
      - api

volumes:
  voiler_pgdata_prod:
    driver: local
```

- [ ] **Step 3: Add `preview` script to root package.json**

Add to `"scripts"`:

```json
"preview": "docker compose -f docker-compose.prod.yml up --build"
```

- [ ] **Step 4: Test dev compose**

```bash
docker compose up --build -d
# Wait for services
docker compose ps
# Check health
curl http://localhost:4000/health
curl http://localhost:3000
docker compose down
```

Expected: All 3 services running. API health check returns ok. Web serves the landing page.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml docker-compose.prod.yml package.json
git commit -m "feat(infra): add full-stack Docker Compose for dev and prod"
```

---

### Task E-3: GitHub Actions CI

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Lint + Typecheck + Test
    runs-on: ubuntu-latest
    timeout-minutes: 10

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: voiler
          POSTGRES_PASSWORD: voiler_ci
          POSTGRES_DB: voiler_ci
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U voiler -d voiler_ci"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Prettier check
        run: pnpm format:check

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Unit tests
        run: pnpm test
        env:
          DATABASE_URL: postgresql://voiler:voiler_ci@localhost:5432/voiler_ci
          AUTH_SECRET: ci-test-secret-at-least-32-characters-long
          NODE_ENV: test
```

- [ ] **Step 2: Verify CI config is valid YAML**

```bash
# Quick syntax check
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "Valid YAML"
```

If python/pyyaml not available, use `npx yaml-lint .github/workflows/ci.yml` or just validate by reading.

- [ ] **Step 3: Commit and push to trigger CI**

```bash
git add .github/workflows/ci.yml
git commit -m "feat(infra): add GitHub Actions CI pipeline"
git push
```

Expected: GitHub Actions runs the workflow on push to main. Check status at the repo's Actions tab.

---

### Task E-4: AGENTS.md + llms.txt

**Files:**

- Create: `AGENTS.md`
- Create: `llms.txt`

- [ ] **Step 1: Create AGENTS.md**

This file follows the open standard for describing a project to AI agents. It should contain:

1. **Project overview** — what Voiler is, the stack
2. **Architecture** — hexagonal layers, package structure
3. **Development workflow** — setup, commands, verification
4. **Coding standards** — the key mandates from CLAUDE.md
5. **Error handling** — neverthrow patterns
6. **Testing** — Vitest + Playwright approach

Read the current `CLAUDE.md` for the source of truth on standards and commands. The AGENTS.md should complement it — broader context that any AI agent (not just Claude) can use.

Keep it under 300 lines. Focus on what an agent needs to know to contribute code safely.

- [ ] **Step 2: Create llms.txt**

Machine-readable project summary. Concise, structured:

```
# Voiler

> AI-first fullstack boilerplate: TanStack Start + tRPC + Hono + Better Auth + Drizzle + PostgreSQL

## Stack
- Frontend: TanStack Start (Vite, React 19, SSR)
- API: tRPC + Hono
- Auth: Better Auth (sessions, OAuth, impersonation)
- ORM: Drizzle (pg-core)
- DB: PostgreSQL
- Validation: Zod
- Errors: neverthrow (Result/ResultAsync)
- i18n: Manual context (English default)
- Monorepo: Turborepo + pnpm
- Tests: Vitest (unit) + Playwright (E2E)
- Format: Prettier (no semicolons)

## Structure
- apps/api — Hono server, tRPC router, Better Auth, use cases
- apps/web — TanStack Start frontend, auth forms, dev menu
- packages/domain — Entities, value objects, domain errors
- packages/core — Port interfaces, app errors
- packages/schema — Zod schemas (inputs, outputs, tables)
- packages/config-env — Zod-validated environment
- packages/config-ts — Shared tsconfig

## Commands
- pnpm dev — Start all (API :4000, web :3000)
- pnpm lint — ESLint strict
- pnpm typecheck — tsc --noEmit
- pnpm test — Vitest unit tests
- pnpm test:e2e — Playwright E2E
- pnpm format:check — Prettier check
- docker compose up — Full stack (PostgreSQL + API + web)

## Key Patterns
- Hexagonal architecture: domain → core → adapters
- neverthrow Result<T,E> for all fallible operations
- Branded types for domain values (Email, UserId, Password)
- tRPC thin routers: parse → use case → return
- container.ts is the only DI composition root
```

- [ ] **Step 3: Run prettier on new files**

```bash
npx prettier --write AGENTS.md llms.txt
```

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md llms.txt
git commit -m "feat(infra): add AGENTS.md and llms.txt for AI agent context"
```

---

### Task E-5: Verification + Final Review

- [ ] **Step 1: Run full verification suite**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

All must pass with 0 errors.

- [ ] **Step 2: Test Docker build**

```bash
docker build -f apps/api/Dockerfile -t voiler-api .
docker build -f apps/web/Dockerfile -t voiler-web .
```

Both must build successfully.

- [ ] **Step 3: Test full stack compose**

```bash
docker compose up --build -d
sleep 5
curl http://localhost:4000/health
docker compose down
```

Health check must return `{"status":"ok"}`.

- [ ] **Step 4: Verify CI triggered**

If pushed to GitHub, check Actions tab for green CI run.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(infra): verification fixes"
```
