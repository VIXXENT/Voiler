# Plan E-Core Infrastructure Review

**Branch:** `feat/plan-e-core-infra`
**Reviewer:** Claude Opus 4.6 (automated)
**Date:** 2026-04-02

---

## Verdict: PASS with 2 important issues

Overall the infra work is solid. Multi-stage Docker builds, proper dev/prod
separation, CI with Postgres service container, and good `.dockerignore`. Two
items need attention before merge.

---

## Critical (must fix)

None.

## Important (should fix)

### I-1. API Dockerfile runs as root in production

Neither Dockerfile creates a non-root user in the runner stage. The API
container runs `node apps/api/dist/index.js` as root. This is a standard
container security hardening step.

**Fix** -- add to both Dockerfiles before `EXPOSE`:

```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

### I-2. Docker Compose dev api/web use `target: builder` -- bloated images

`docker-compose.yml` sets `target: builder` for both `api` and `web` services.
The builder stage contains full dev dependencies, source, and build tooling.
This is fine for local dev (the volumes override source anyway), but the built
image is unnecessarily large and cached layers include all dev deps.

This is acceptable for local dev convenience -- the volume mounts + command
override mean the image is just providing the node_modules. No change strictly
required, but worth a comment in the compose file so future contributors
understand the intent.

## Suggestions (nice to have)

### S-1. `.dockerignore` excludes `dist` and `.output`

The `.dockerignore` excludes `dist` and `.output` directories. This is correct
for the initial `COPY` commands (you build inside Docker), but if someone ever
adds a pre-built artifact workflow it would silently break. Low risk, just
noting it.

### S-2. CI workflow has no Docker build smoke test

The CI runs lint/typecheck/test but never builds the Docker images. A broken
Dockerfile would only be caught at deploy time. Consider adding a
`docker build --target runner` step in a separate job, even without push.

### S-3. `apk del python3` missing in API runner stage

Line 63-65 of the API Dockerfile installs `python3 make g++` for argon2
rebuild, then deletes `make g++` but keeps `python3`. This adds ~50MB to the
final image. Either delete python3 too or move argon2 rebuild to builder and
copy the native binary.

### S-4. Web Dockerfile `VITE_API_URL` default

The web Dockerfile declares `ARG VITE_API_URL` with no default. If the arg is
not passed, Vite will bake in `undefined`. The prod compose file correctly
requires it (`${VITE_API_URL:?required}`), so this only matters if someone
runs `docker build` directly without the arg. Low risk.

### S-5. `preview` script uses prod compose without `.env`

`package.json` defines `"preview": "docker compose -f docker-compose.prod.yml
up --build"`. The prod compose file requires `POSTGRES_USER`, `DATABASE_URL`,
`AUTH_SECRET`, and `VITE_API_URL` via `:?required` syntax. Running
`pnpm preview` without a `.env` file will fail with an unhelpful Docker
Compose error. Consider adding a `.env.prod.example` or documenting the
required variables.

---

## File-by-file notes

| File                       | Status                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `apps/api/Dockerfile`      | Good multi-stage, proper layer caching. Needs non-root user (I-1), python3 cleanup (S-3). |
| `apps/web/Dockerfile`      | Clean Nitro self-contained output. Needs non-root user (I-1).                             |
| `.dockerignore`            | Correct exclusions.                                                                       |
| `docker-compose.yml`       | Dev setup works. Builder target is intentional for volume mounts.                         |
| `docker-compose.prod.yml`  | Proper use of `:?required` for secrets. No secrets in image layers.                       |
| `.github/workflows/ci.yml` | Correct: Postgres service, pnpm cache, frozen lockfile, env vars for tests.               |
| `AGENTS.md`                | Comprehensive agent guide. Matches CLAUDE.md conventions.                                 |
| `llms.txt`                 | Good concise project summary for LLM context.                                             |
| `package.json`             | `preview` script added. Works but needs env documentation (S-5).                          |
