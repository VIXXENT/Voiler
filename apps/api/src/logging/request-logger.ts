import type { MiddlewareHandler } from "hono"

declare module "hono" {
  interface ContextVariableMap {
    requestId: string
  }
}

/**
 * Structured log entry for request start events.
 */
interface RequestStartLog {
  readonly level: string
  readonly event: string
  readonly requestId: string
  readonly method: string
  readonly path: string
  readonly timestamp: string
}

/**
 * Structured log entry for request completion events.
 */
interface RequestCompleteLog {
  readonly level: string
  readonly event: string
  readonly requestId: string
  readonly method: string
  readonly path: string
  readonly status: number
  readonly durationMs: number
}

/**
 * Hono middleware that assigns a unique request ID to every
 * incoming request and logs structured start/completion events.
 *
 * The request ID is stored in the Hono context as `requestId`
 * and can be retrieved via `c.get('requestId')`.
 */
const requestLogger: () => MiddlewareHandler = () => {
  // eslint-disable-next-line max-params
  return async (c, next) => {
    const requestId: string = crypto.randomUUID()
    const method: string = c.req.method
    const path: string = c.req.path
    const startMs: number = Date.now()

    c.set("requestId", requestId)

    const startLog: RequestStartLog = {
      level: "info",
      event: "request.start",
      requestId,
      method,
      path,
      timestamp: new Date(startMs).toISOString(),
    }

    console.warn(JSON.stringify(startLog))

    await next()

    const durationMs: number = Date.now() - startMs

    const completeLog: RequestCompleteLog = {
      level: "info",
      event: "request.complete",
      requestId,
      method,
      path,
      status: c.res.status,
      durationMs,
    }

    console.warn(JSON.stringify(completeLog))
  }
}

export { requestLogger }
