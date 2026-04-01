import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import type { DbClient } from "../db/index.js"

/**
 * Audit log table for tracking use-case executions
 * and request-level actions across the application.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const AuditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: text("request_id").notNull(),
  action: text("action").notNull(),
  userId: text("user_id"),
  entityId: text("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
})

/**
 * Entry data for writing an audit log record.
 */
interface AuditLogEntry {
  readonly requestId: string
  readonly action: string
  readonly userId?: string
  readonly entityId?: string
  readonly metadata?: Record<string, unknown>
}

/**
 * Parameters for writing an audit log entry.
 */
interface WriteAuditLogParams {
  readonly db: DbClient
  readonly entry: AuditLogEntry
}

/**
 * Write an audit log entry to the database.
 * Fire-and-forget -- does not block the request.
 * Errors are logged to console but never thrown.
 */
const writeAuditLog: (
  params: WriteAuditLogParams,
) => void = (params) => {
  const { db, entry } = params

  void db
    .insert(AuditLog)
    .values({
      requestId: entry.requestId,
      action: entry.action,
      userId: entry.userId ?? null,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
    })
    .then(() => undefined)
    .catch((error: unknown) => {
      console.error(
        JSON.stringify({
          level: "error",
          message: "Failed to write audit log",
          action: entry.action,
          requestId: entry.requestId,
          error: String(error),
        }),
      )
    })
}

export { AuditLog, writeAuditLog }
export type { AuditLogEntry, WriteAuditLogParams }
