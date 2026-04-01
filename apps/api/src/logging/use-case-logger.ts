import type { ResultAsync } from "neverthrow"

import type { DbClient } from "../db/index.js"

import { writeAuditLog } from "./audit-log.repository.js"

/**
 * Configuration for wrapping a use case with audit logging.
 */
interface UseCaseLoggerParams<TParams, TResult, TError> {
  readonly name: string
  readonly useCase: (
    params: TParams,
  ) => ResultAsync<TResult, TError>
  readonly getEntityId?: (
    result: TResult,
  ) => string | undefined
  readonly db: DbClient
}

/**
 * Extended use-case parameters that include optional
 * request tracking and user identification fields.
 */
interface AuditableParams {
  readonly requestId?: string
  readonly userId?: string
}

/**
 * Wraps a use case with structured logging and audit trail.
 *
 * Logs a console entry before execution, then on success
 * writes an audit log record with the action name, user,
 * and affected entity. On failure, logs the error to console.
 *
 * The wrapped use case preserves the original ResultAsync
 * contract -- audit logging never affects the result.
 */
const withAuditLog: <TParams, TResult, TError>(
  params: UseCaseLoggerParams<TParams, TResult, TError>,
) => (
  useCaseParams: TParams & AuditableParams,
) => ResultAsync<TResult, TError> = (params) => {
  const { name, useCase, getEntityId, db } = params

  return (useCaseParams) => {
    const { requestId, userId } = useCaseParams

    console.warn(
      JSON.stringify({
        level: "info",
        event: "use-case.start",
        action: name,
        requestId: requestId ?? "unknown",
        userId: userId ?? "anonymous",
      }),
    )

    return useCase(useCaseParams).map((result) => {
      const entityId: string | undefined = getEntityId
        ? getEntityId(result)
        : undefined

      console.warn(
        JSON.stringify({
          level: "info",
          event: "use-case.success",
          action: name,
          requestId: requestId ?? "unknown",
          entityId: entityId ?? null,
        }),
      )

      writeAuditLog({
        db,
        entry: {
          requestId: requestId ?? "unknown",
          action: name,
          userId,
          entityId,
        },
      })

      return result
    }).mapErr((error) => {
      console.error(
        JSON.stringify({
          level: "error",
          event: "use-case.failure",
          action: name,
          requestId: requestId ?? "unknown",
          error: String(error),
        }),
      )

      return error
    })
  }
}

export { withAuditLog }
export type { UseCaseLoggerParams, AuditableParams }
