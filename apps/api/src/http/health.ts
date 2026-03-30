import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { sql } from 'drizzle-orm'
import { fromPromise, type ResultAsync } from 'neverthrow'
import { db } from '../db/index.js'

/**
 * Shape of the enriched health check response payload.
 *
 * Why: typed separately so the handler return is verifiable at compile time
 * and consumers can import the type for testing or documentation.
 */
type HealthPayload = {
  status: 'ok' | 'degraded';
  uptime: number;
  version: string;
  db: 'connected' | 'error';
};

/**
 * Runs a lightweight DB connectivity probe via `SELECT 1`.
 *
 * Why: uses neverthrow so the caller never needs try/catch and the failure
 * path is explicit in the type signature.
 *
 * @returns ResultAsync resolving to void on success, or an Error on failure.
 */
/**
 * Wraps the DB probe promise to return void.
 * Isolated here to avoid .then() which is banned by ESLint rules.
 *
 * @returns Promise<void> resolved when the probe succeeds.
 */
const runDbProbe: () => Promise<void> = async (): Promise<void> => {
  await db.run(sql`SELECT 1`)
}

const probeDb: () => ResultAsync<void, Error> = () =>
  fromPromise(
    runDbProbe(),
    (e: unknown): Error =>
      e instanceof Error ? e : new Error(String(e)),
  )

/**
 * Params type for the health handler — uses single-object convention.
 */
type HealthHandlerParams = {
  req: ExpressRequest;
  res: ExpressResponse;
};

/**
 * GET /health — enriched health check endpoint.
 *
 * Why: exposes operational metadata (uptime, version, DB status) so
 * infrastructure probes and dashboards have a single canonical source.
 *
 * @param params - Object containing Express req and res.
 * @returns A promise that resolves when the response has been sent.
 */
const healthHandler: (params: HealthHandlerParams) => Promise<void> = async (
  params,
) => {
  const { res } = params

  const version: string = process.env['npm_package_version'] ?? '0.0.0'
  const uptime: number = process.uptime()

  const dbResult: Awaited<ReturnType<typeof probeDb>> = await probeDb()

  const dbStatus: HealthPayload['db'] = dbResult.isOk() ? 'connected' : 'error'

  const payload: HealthPayload = {
    status: 'ok',
    uptime,
    version,
    db: dbStatus,
  }

  const httpStatus: number = dbStatus === 'connected' ? 200 : 503

  res.status(httpStatus).json(payload)
}

export { healthHandler }
