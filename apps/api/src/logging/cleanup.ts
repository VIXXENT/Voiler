import { lt } from 'drizzle-orm'

import type { DbClient } from '../db/index.js'

import { AuditLog } from './audit-log.repository.js'

/**
 * Default maximum age for audit log entries in days.
 */
const DEFAULT_MAX_AGE_DAYS = 30

/**
 * Milliseconds in a single day.
 */
const MS_PER_DAY = 86_400_000

/**
 * Parameters for the audit log cleanup operation.
 */
interface CleanupAuditLogParams {
  readonly db: DbClient
  readonly maxAgeDays?: number
}

/**
 * Delete audit log entries older than the specified
 * maximum age. Defaults to 30 days.
 *
 * Intended to be called periodically (e.g., on server
 * start or via a cron job) to enforce a rolling
 * retention window.
 */
const cleanupAuditLog: (params: CleanupAuditLogParams) => Promise<void> = async (params) => {
  const { db, maxAgeDays } = params

  const ageDays: number = maxAgeDays ?? DEFAULT_MAX_AGE_DAYS
  const cutoffMs: number = Date.now() - ageDays * MS_PER_DAY
  const cutoffDate: Date = new Date(cutoffMs)

  await db.delete(AuditLog).where(lt(AuditLog.createdAt, cutoffDate))

  console.warn(
    JSON.stringify({
      level: 'info',
      event: 'audit-log.cleanup',
      cutoffDate: cutoffDate.toISOString(),
      maxAgeDays: ageDays,
    }),
  )
}

export { cleanupAuditLog }
export type { CleanupAuditLogParams }
