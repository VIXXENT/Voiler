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
      const forwardedFor = c.req.header('x-forwarded-for')
      const realIp = c.req.header('x-real-ip')

      // Use last IP in X-Forwarded-For (set by the trusted reverse proxy)
      const ips = forwardedFor?.split(',').map((ip) => ip.trim())
      return ips?.at(-1) ?? realIp ?? '127.0.0.1'
    },
  })

  return limiter
}

export { createRateLimiter }
