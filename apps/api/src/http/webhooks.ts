import type { Request as ExpressRequest, Response as ExpressResponse } from 'express'

/**
 * Params type for the webhooks handler — single-object convention.
 */
type WebhooksHandlerParams = {
  req: ExpressRequest;
  res: ExpressResponse;
};

/**
 * POST /webhooks — placeholder endpoint returning 501 Not Implemented.
 *
 * Why: reserves the route in the API surface so clients can discover it
 * early and tests can assert the correct HTTP status before the feature
 * is built out.
 *
 * Context: future webhook consumers (e.g. payment gateways, CI pipelines)
 * will POST signed payloads here. Implementation tracked separately.
 *
 * @param params - Object containing Express req and res.
 * @returns void — response is sent synchronously.
 */
const webhooksHandler: (params: WebhooksHandlerParams) => void = (params) => {
  const { res } = params

  res.status(501).json({
    error: 'Not Implemented',
    message: 'Webhook handling is not yet available.',
  })
}

export { webhooksHandler }
