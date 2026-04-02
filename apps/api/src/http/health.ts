import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

import type { DbClient } from '../db/index.js'

interface HealthRouteParams {
  db: DbClient
  startTime: number
}

interface HealthResponse {
  status: 'ok' | 'error'
  uptime: number
  db: 'connected' | 'disconnected'
  timestamp: string
}

/**
 * Create the health check HTTP route.
 * Returns server status, uptime, database connectivity, and timestamp.
 *
 * @param params - Object containing the Drizzle DB client and server start time.
 * @returns Hono router with GET /health endpoint.
 */
const createHealthRoute = (params: HealthRouteParams): Hono => {
  const { db, startTime } = params

  const route = new Hono()

  route.get('/health', async (c) => {
    let dbStatus: HealthResponse['db']

    try {
      await db.execute(sql`SELECT 1`)
      dbStatus = 'connected'
    } catch {
      dbStatus = 'disconnected'
    }

    const uptimeMs: number = Date.now() - startTime
    const uptimeSeconds: number = Math.floor(uptimeMs / 1000)

    const response: HealthResponse = {
      status: dbStatus === 'connected' ? 'ok' : 'error',
      uptime: uptimeSeconds,
      db: dbStatus,
      timestamp: new Date().toISOString(),
    }

    const statusCode: ContentfulStatusCode = dbStatus === 'connected' ? 200 : 503

    return c.json(response, statusCode)
  })

  return route
}

export { createHealthRoute }
export type { HealthResponse }
