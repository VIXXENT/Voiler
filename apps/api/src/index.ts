import { serve } from '@hono/node-server'
import { loadEnv } from '@voiler/config-env'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'

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
  authSecret: env.AUTH_SECRET,
})

/**
 * Allowed CORS origins.
 * In development, allow localhost frontend.
 * In production, this should be set via environment variable.
 */
const allowedOrigins: string[] =
  env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:4000'] : []

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
  auth: {
    authenticate: container.authenticate,
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
    void cleanupAuditLog({ db })
  },
)
