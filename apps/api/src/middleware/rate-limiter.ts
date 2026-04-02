import type { MiddlewareHandler } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'

/**
 * Default rate limit: 100 requests per minute per IP.
 */
const DEFAULT_WINDOW_MS = 60_000
const DEFAULT_MAX_REQUESTS = 100

interface RateLimiterConfig {
  windowMs?: number
  max?: number
}

/**
 * Global rate limiter middleware.
 * Limits requests per IP address to prevent abuse and DDoS.
 *
 * @param config - Optional override for window duration and max requests.
 * @returns Hono middleware handler that enforces rate limiting.
 */
const createRateLimiter = (config?: RateLimiterConfig): MiddlewareHandler => {
  const windowMs: number = config?.windowMs ?? DEFAULT_WINDOW_MS
  const max: number = config?.max ?? DEFAULT_MAX_REQUESTS

  const limiter = rateLimiter({
    windowMs,
    limit: max,
    standardHeaders: 'draft-6',
    keyGenerator: (c) => {
      const forwardedFor: string | undefined = c.req.header('x-forwarded-for')
      const realIp: string | undefined = c.req.header('x-real-ip')
      const fallback = '127.0.0.1'

      return forwardedFor?.split(',')[0]?.trim() ?? realIp ?? fallback
    },
  })

  return limiter
}

export { createRateLimiter }
