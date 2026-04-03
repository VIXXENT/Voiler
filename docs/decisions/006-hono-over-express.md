# ADR-006: Hono Over Express

**Status:** Accepted
**Date:** 2026-04-03

## Context

The API needs an HTTP server that:

1. Handles routing, middleware, and request/response with good TypeScript support.
2. Can run on Node.js today and potentially on edge runtimes (Cloudflare Workers,
   Bun, Deno) in the future without a full rewrite.
3. Has a composable middleware system compatible with security requirements (CSP,
   CORS, rate limiting, secure headers).
4. Integrates with tRPC and Better Auth without heavy adapter layers.
5. Is lightweight — the API is the only backend; there is no need for a full
   application framework.

## Decision

We use [Hono](https://hono.dev) as the HTTP framework.

- The Hono app is created in `apps/api/src/index.ts`.
- Security middleware (CORS, CSP, rate limiting, secure headers) is applied at
  the app level using `hono/security-headers`, `hono/cors`, and `hono-rate-limiter`.
- tRPC is mounted via `@hono/trpc-server` at `/api/trpc`.
- Better Auth routes are mounted at `/api/auth` using Better Auth's Hono handler.
- Health and readiness endpoints are plain Hono routes.
- The app is exported as a named export so it can be tested with `@hono/testing`
  without starting a real server.

## Alternatives Considered

**Express**
Express is the most widely known Node.js framework and has the largest ecosystem.
However:

- TypeScript support is via `@types/express`, not native. Request/response types
  require manual augmentation for middleware-injected properties.
- Express does not implement the Web Fetch API (`Request`/`Response`). Running on
  edge runtimes or Bun requires a compatibility layer.
- Middleware model is callback-based (`(req, res, next)`), which does not compose
  as cleanly with async/await as Hono's handler model.
- Express 5 addressed some of these issues but adoption is still low at the time
  of decision.

**Fastify**
Fastify has excellent performance, a plugin system, and good TypeScript support via
schemas. However:

- Its plugin/decorator model is more complex than Hono's for small APIs.
- It does not implement the Web Fetch API natively.
- The schema-based validation (JSON Schema) duplicates Zod validation already
  present in tRPC.

**Elysia**
Elysia is Bun-first, fast, and has a TypeScript-native API. At the time of decision,
Node.js support was experimental and the ecosystem was immature. Revisit if Bun
becomes the primary runtime.

**Koa**
More modern than Express but smaller ecosystem, no Web Fetch API support, and
effectively superseded by Hono for new projects.

## Consequences

**Positive:**

- Hono handlers use the Web Fetch API (`Request`/`Response`). Migrating to an edge
  runtime requires changing only the entry point, not the application code.
- TypeScript types are first-class; no `@types` package required.
- The `c.get()` / `c.set()` context pattern is cleaner than Express
  `req.locals` augmentation for middleware-injected values.
- Testing is straightforward: pass a `Request` object, receive a `Response`.
  No HTTP server required.
- `hono/security-headers` covers most security header requirements out of the box.

**Negative:**

- Hono's ecosystem is smaller than Express. Some Express middleware has no Hono
  equivalent and must be reimplemented.
- Edge runtime compatibility is a future benefit, not a current requirement.
  The abstraction cost is paid now for uncertain future value.
- Less community documentation and fewer Stack Overflow answers than Express.
