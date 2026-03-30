import { Router, type Request as ExpressRequest, type Response as ExpressResponse } from 'express'
import { healthHandler } from './health.js'
import { webhooksHandler } from './webhooks.js'

/**
 * Express Router with all REST HTTP routes mounted.
 *
 * Why: isolates HTTP routes from the Apollo/GraphQL bootstrap so each
 * concern can be tested and evolved independently.
 *
 * Routes:
 *   GET  /health    — enriched health check (uptime, version, DB status)
 *   POST /webhooks  — placeholder returning 501 Not Implemented
 *
 * Usage: `app.use(httpRouter)` after cors/json middleware.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const httpRouter = Router()

/* eslint-disable max-params -- Express route callbacks require (req, res) */
httpRouter.get('/health', (req: ExpressRequest, res: ExpressResponse): void => {
  void healthHandler({ req, res })
})

httpRouter.post('/webhooks', (req: ExpressRequest, res: ExpressResponse): void => {
  webhooksHandler({ req, res })
})
/* eslint-enable max-params */

export { httpRouter }
