import { serve } from '@hono/node-server'
import { loadEnv } from '@voiler/config-env'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'

import { createAuth } from './auth/index.js'
import './auth/types.js'
import { createContainer } from './container.js'
import { createDb } from './db/index.js'
import { createHealthRoute } from './http/index.js'
import { cleanupAuditLog, requestLogger } from './logging/index.js'
import { createRateLimiter } from './middleware/rate-limiter.js'
import { securityHeaders, csrfProtection } from './middleware/security.js'
import { createTrpcRoute } from './trpc/index.js'
import { createAppRouter } from './trpc/router.js'

/**
 * Maximum request body size in bytes (1 MB).
 * Prevents payload-based DoS attacks.
 */
const MAX_BODY_SIZE: number = 1_048_576

/**
 * Server start timestamp for uptime calculation.
 */
const startTime: number = Date.now()

/**
 * Load and validate environment variables.
 * Exits process immediately if validation fails.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const env = loadEnv()

/**
 * Create database connection.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const db = createDb({ databaseUrl: env.DATABASE_URL })

/**
 * Create the DI container with all wired use cases.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const container = createContainer({
  db,
})

/**
 * Allowed CORS origins.
 * In development, allow localhost frontend.
 * In production, this should be set via environment variable.
 */
const defaultDevOrigins: string[] = ['http://localhost:3000', 'http://localhost:4000']
const allowedOrigins: string[] =
  env.TRUSTED_ORIGINS.length > 0
    ? env.TRUSTED_ORIGINS
    : env.NODE_ENV === 'development'
      ? defaultDevOrigins
      : []

/**
 * Create the Better Auth instance.
 * Handles authentication routes at /api/auth/*.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const auth = createAuth({
  db,
  secret: env.AUTH_SECRET,
  trustedOrigins: allowedOrigins,
  googleClientId: env.GOOGLE_CLIENT_ID,
  googleClientSecret: env.GOOGLE_CLIENT_SECRET,
  githubClientId: env.GITHUB_CLIENT_ID,
  githubClientSecret: env.GITHUB_CLIENT_SECRET,
})

/**
 * Create and configure the Hono application.
 *
 * Middleware order matters:
 * 1. Rate limiter (reject abusive IPs early)
 * 2. Request logger (assign ID, log start/end)
 * 3. Security headers (set on every response)
 * 4. CORS (validate origin before processing)
 * 5. CSRF (validate origin on mutations)
 * 6. Body limit (reject oversized payloads)
 * 7. Routes
 */
// eslint-disable-next-line @typescript-eslint/typedef
const app = new Hono()

// --- Middleware ---
app.use('*', createRateLimiter())
// Stricter rate limit for auth endpoints (10 req/min)
app.use('/api/auth/*', createRateLimiter({ windowMs: 60_000, max: 10 }))
app.use('*', requestLogger())
app.use('*', securityHeaders())
app.use(
  '*',
  cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  }),
)
app.use('*', csrfProtection({ allowedOrigins }))
app.use(
  '*',
  bodyLimit({
    maxSize: MAX_BODY_SIZE,
    onError: (c) => {
      return c.json({ error: 'Payload too large' }, 413)
    },
  }),
)

// --- Better Auth routes ---
app.on(['POST', 'GET'], '/api/auth/**', (c) => {
  return auth.handler(c.req.raw)
})

// --- Session extraction middleware ---
// Skip for Better Auth routes (they handle their own sessions)
// eslint-disable-next-line max-params
app.use('*', async (c, next) => {
  if (c.req.path.startsWith('/api/auth/')) {
    c.set('user', null)
    c.set('session', null)
    await next()
    return
  }
  // eslint-disable-next-line @typescript-eslint/typedef
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  })
  c.set('user', session?.user ?? null)
  c.set('session', session?.session ?? null)
  await next()
})

// --- Routes ---
// eslint-disable-next-line @typescript-eslint/typedef
const healthRoute = createHealthRoute({ db, startTime })
app.route('/', healthRoute)

// eslint-disable-next-line @typescript-eslint/typedef
const appRouter = createAppRouter({
  user: {
    createUser: container.createUser,
    getUser: container.getUser,
    listUsers: container.listUsers,
  },
  session: {
    listSessions: (p) => auth.api.listSessions({ headers: p.headers }),
    revokeSession: (p) =>
      auth.api.revokeSession({
        headers: p.headers,
        body: { token: p.token },
      }),
    revokeOtherSessions: (p) =>
      auth.api.revokeOtherSessions({
        headers: p.headers,
      }),
    revokeSessions: (p) =>
      auth.api.revokeSessions({
        headers: p.headers,
      }),
  },
  admin: {
    impersonateUser: (p) =>
      auth.api.impersonateUser({
        headers: p.headers,
        body: { userId: p.userId },
      }),
    stopImpersonating: (p) =>
      auth.api.stopImpersonating({
        headers: p.headers,
      }),
  },
})

// eslint-disable-next-line @typescript-eslint/typedef
const trpcRoute = createTrpcRoute({
  appRouter,
  db,
})
app.route('/trpc', trpcRoute)

// --- Server ---
serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.warn(`[api] Server running on ` + `http://localhost:${String(info.port)}`)
    console.warn(`[api] Environment: ${env.NODE_ENV}`)

    // Fire-and-forget audit log cleanup on startup
    void cleanupAuditLog({ db }).catch((cleanupErr: unknown) => {
      console.error('[api] Audit log cleanup failed:', cleanupErr)
    })
  },
)
