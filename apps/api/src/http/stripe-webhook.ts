import type { AppError } from '@voiler/core'
import type { Context } from 'hono'
import type { ResultAsync } from 'neverthrow'

/**
 * Dependencies for the Stripe webhook handler.
 */
interface StripeWebhookHandlerDeps {
  readonly handleStripeWebhook: (params: {
    type: string
    data: Record<string, unknown>
  }) => ResultAsync<void, AppError>
}

/** Type guard: checks if a value is a non-null object. */
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/** Type guard: checks if a parsed JSON value is a valid webhook event shape. */
const isWebhookEvent = (v: unknown): v is { type: string; data: Record<string, unknown> } => {
  if (!isRecord(v)) {
    return false
  }
  return typeof v.type === 'string' && isRecord(v.data)
}

/**
 * Create the Stripe webhook route handler.
 *
 * Parses raw body as JSON and verifies the event shape.
 * Routes to the handleStripeWebhook use-case.
 * Returns 400 for invalid payloads and 500 for processing errors.
 */
const createStripeWebhookHandler: (
  deps: StripeWebhookHandlerDeps,
) => (c: Context) => Promise<Response> = (deps) => async (c) => {
  const body = await c.req.text()

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  if (!isWebhookEvent(parsed)) {
    return c.json({ error: 'Invalid webhook event shape' }, 400)
  }

  const result = await deps.handleStripeWebhook({
    type: parsed.type,
    data: parsed.data,
  })

  return result.match(
    () => c.json({ received: true }),
    () => c.json({ error: 'Webhook processing failed' }, 500),
  )
}

export { createStripeWebhookHandler }
export type { StripeWebhookHandlerDeps }
