/**
 * @module logging
 *
 * Structured logging system with request tracking,
 * use-case auditing, and automatic log cleanup.
 *
 * - requestLogger: Hono middleware for request-level tracing
 * - withAuditLog: Use-case wrapper for audit trail
 * - writeAuditLog: Direct audit log write function
 * - cleanupAuditLog: Rolling retention (30-day default)
 * - AuditLog: Drizzle table definition
 */

export { AuditLog, writeAuditLog } from "./audit-log.repository.js"
export type {
  AuditLogEntry,
  WriteAuditLogParams,
} from "./audit-log.repository.js"

export { requestLogger } from "./request-logger.js"

export { withAuditLog } from "./use-case-logger.js"
export type {
  UseCaseLoggerParams,
  AuditableParams,
} from "./use-case-logger.js"

export { cleanupAuditLog } from "./cleanup.js"
export type { CleanupAuditLogParams } from "./cleanup.js"
