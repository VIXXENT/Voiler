import 'dotenv/config'
import './lib/logger.js'
import type { IncomingMessage, ServerResponse } from 'node:http'
import express, {
  type Request as ExpressRequest,
  type Response as ExpressResponse,
  type RequestHandler,
} from 'express'
import cors from 'cors'
import { ApolloServer } from '@apollo/server'
import {
  expressMiddleware,
  type ExpressContextFunctionArgument,
} from '@apollo/server/express4'
import { authHandler } from './lib/auth.js'
import { typeDefs } from './graphql/typeDefs.js'
import { resolvers } from './graphql/resolvers.js'
import { httpRouter } from './http/index.js'

/**
 * Express application instance.
 */
const app: express.Express = express()
app.set('trust proxy', true)

/**
 * Server port configuration.
 */
const port: string | number = process.env.PORT || 4000

/**
 * Independent type for toWebRequest function params.
 */
type ToWebRequestParams = {
  req: ExpressRequest;
};

/**
 * Utility to convert Express Request to Web Request for Auth.js.
 * @param params - The input parameters containing Express Request.
 * @returns A standard Web API Request object.
 */
const toWebRequest: (params: ToWebRequestParams) => Request = (params) => {
  const { req } = params
  // Always use the browser's perceived origin for Auth.js internal logic
  const browserOrigin: string = process.env.AUTH_URL
    ? new URL(process.env.AUTH_URL).origin
    : 'http://localhost:5173'
  const url: string = `${browserOrigin}${req.originalUrl}`

  const headers: Headers = new Headers()
  Object.entries(req.headers).forEach(([key, value]): void => {
    if (Array.isArray(value)) {
      value.forEach((v: string): void => {
        headers.append(key, v)
      })
    } else if (value) {
      headers.append(key, value)
    }
  })
  // Ensure Host header matches the browser's origin so Auth.js
  // generates correct cookies and callback URLs with trustHost: true
  headers.set('host', new URL(browserOrigin).host)

  /**
   * Safe body retrieval checking for rawBody property.
   */
  const getRawBody: (r: ExpressRequest) => string | null = (r) => {
    if ('rawBody' in r && typeof r.rawBody === 'string') {
      return r.rawBody
    }
    return null
  }

  const body: BodyInit | null = req.method !== 'GET' && req.method !== 'HEAD'
    ? getRawBody(req) || JSON.stringify(req.body)
    : null

  return new Request(url, {
    method: req.method,
    headers,
    body,
  })
}

/**
 * Type for the start server function.
 */
type StartFn = () => Promise<void>;

/**
 * Initializes and starts the Apollo and Express servers.
 * @returns A promise that resolves when the server is ready.
 */
const start: StartFn = async (): Promise<void> => {
  const server: ApolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  })

  await server.start()

  app.use(cors({
    origin: process.env.AUTH_URL ? new URL(process.env.AUTH_URL).origin : 'http://localhost:5173',
    credentials: true,
  }))

  /* eslint-disable max-params -- Express verify callback requires 3 params */
  const captureRawBody: (
    req: IncomingMessage,
    _res: ServerResponse,
    buf: Buffer,
  ) => void = (req, _res, buf) => {
    /* eslint-enable max-params */
    try {
      if (buf && buf.length > 0) {
        (req as IncomingMessage & { rawBody: string }).rawBody =
          buf.toString()
      }
    } catch (e: unknown) {
      console.warn('Error capturing raw body:', e)
    }
  }

  app.use(express.json({ verify: captureRawBody }))
  app.use(express.urlencoded({ extended: true, verify: captureRawBody }))

  /**
   * REST HTTP routes (health, webhooks placeholder).
   */
  app.use(httpRouter)

  /**
   * Auth.js route handler middleware.
   * Complies with Express signature while maintaining internal consistency.
   */
  /* eslint-disable max-params -- Express RequestHandler requires (req, res) */
  const handleAuth: RequestHandler = async (
    req: ExpressRequest,
    res: ExpressResponse,
  ): Promise<void> => {
    /* eslint-enable max-params */
    try {
      console.info(`🔐 Auth Request: ${req.method} ${req.originalUrl}`)
      const webReq: Request = toWebRequest({ req })
      const webRes: Response = await authHandler(webReq)

      console.info(`🔐 Auth Response: ${webRes.status} ${webRes.statusText}`)

      /**
       * Transfer headers safely.
       * Set-Cookie is special: multiple cookies must be sent as separate headers.
       */
      const headerEntries: [string, string][] =
        Array.from(webRes.headers.entries())
      for (const [key, value] of headerEntries) {
        const normalizedKey: string = key.toLowerCase()
        if (normalizedKey === 'set-cookie') {
          /**
           * Robust Set-Cookie handling for environments without getSetCookie().
           * We split by comma but avoid splitting on commas inside dates (GMT).
           * Example: "cookie1=val; Expires=Mon, 01 Jan 2024..., cookie2=val"
           */
          const hasGetSetCookie: boolean =
            'getSetCookie' in webRes.headers &&
            typeof webRes.headers.getSetCookie === 'function'
          const rawCookies: string | string[] = hasGetSetCookie
            ? webRes.headers.getSetCookie()
            : value.split(/, (?=[a-zA-Z]{3,4} )/)

          res.append('Set-Cookie', rawCookies)
        } else if (normalizedKey !== 'content-encoding' && normalizedKey !== 'content-length') {
          res.setHeader(key, value)
        }
      }

      res.status(webRes.status)
      const body: string = await webRes.text()
      res.send(body)
    } catch (error) {
      console.error('❌ Auth Handler Crash:', error)
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Auth Error',
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  app.use('/api/auth', handleAuth)

  /**
   * GraphQL endpoint middleware.
   * Uses ExpressContextFunctionArgument to align with Apollo's expectations.
   */
  /**
   * Bridge Apollo Server Express 4 types to Express 5.
   *
   * Why: Apollo's expressMiddleware expects Express 4 types internally.
   * Express 5's Request is structurally compatible but nominally different.
   * This is the one place where a type bridge is unavoidable.
   */
  // eslint-disable-next-line @typescript-eslint/typedef
  const apolloMiddleware = expressMiddleware(server, {
    context: async (
      args: ExpressContextFunctionArgument,
    ): Promise<{ req: ExpressRequest }> => {
      const { req } = args
      if (!req) {
        throw new Error(
          'GraphQL context: missing request object.',
        )
      }
      return { req: req as unknown as ExpressRequest }
    },
  })
  const graphqlHandler: RequestHandler =
    apolloMiddleware as unknown as RequestHandler

  app.use('/graphql', graphqlHandler)

  app.listen(Number(port), (): void => {
    console.info(`🚀 Server ready at http://localhost:${port}/graphql`)
    console.info(`🔐 Auth endpoints at http://localhost:${port}/api/auth/*`)
  })
}

start().catch((err: unknown): void => {
  console.error('Failed to start server:', err)
})
