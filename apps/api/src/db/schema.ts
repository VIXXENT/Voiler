/**
 * Re-exports all Drizzle table definitions from @voiler/schema.
 * This file is the single import point for Drizzle migrations and queries.
 *
 * @remarks
 * drizzle-kit reads this file for migration generation.
 * New tables from @voiler/schema must be re-exported here.
 */
export { User } from '@voiler/schema'
export { AuditLog } from '../logging/audit-log.repository.js'
