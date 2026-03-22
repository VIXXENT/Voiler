import 'dotenv/config'
import './lib/logger.js'
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
const toWebRequest = (params: ToWebRequestParams): Request => {
  const { req } = params
  // Always use the browser's perceived origin for Auth.js internal logic
  const protocol: string = 'http'
  const host: string = 'localhost:5173'
  const url: string = `${protocol}://${host}${req.originalUrl}`

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

  /**
   * Safe body retrieval checking for rawBody property.
   */
  const getRawBody = (r: ExpressRequest): string | null => {
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

  const captureRawBody = (req: any, _res: any, buf: Buffer) => {
    try {
      if (buf && buf.length > 0) {
        req.rawBody = buf.toString()
      }
    } catch (e) {
      console.warn('Error capturing raw body:', e)
    }
  }

  app.use(express.json({ verify: captureRawBody }))
  app.use(express.urlencoded({ extended: true, verify: captureRawBody }))

  /**
   * Auth.js route handler middleware.
   * Complies with Express signature while maintaining internal consistency.
   */
  const handleAuth: RequestHandler = async (
    req: ExpressRequest,
    res: ExpressResponse,
  ): Promise<void> => {
    try {
      console.info(`🔐 Auth Request: ${req.method} ${req.originalUrl}`)
      const webReq: Request = toWebRequest({ req })
      const webRes: Response = await authHandler(webReq)

      console.info(`🔐 Auth Response: ${webRes.status} ${webRes.statusText}`)

      /**
       * Transfer headers safely.
       * Set-Cookie is special: multiple cookies must be sent as separate headers.
       */
      const headerEntries = Array.from(webRes.headers.entries())
      for (const [key, value] of headerEntries) {
        const normalizedKey = key.toLowerCase()
        if (normalizedKey === 'set-cookie') {
          /**
           * Robust Set-Cookie handling for environments without getSetCookie().
           * We split by comma but avoid splitting on commas inside dates (GMT).
           * Example: "cookie1=val; Expires=Mon, 01 Jan 2024..., cookie2=val"
           */
          const rawCookies = (webRes.headers as any).getSetCookie
            ? (webRes.headers as any).getSetCookie()
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
  const graphqlHandler: RequestHandler = expressMiddleware(server, {
    context: async (args: ExpressContextFunctionArgument): Promise<{ req: ExpressRequest }> => {
      // Bridge between Apollo (Express 4 types) and Project (Express 5 types).
      // We verify the request object exists before returning it.
      const { req } = args
      if (!req) {
        throw new Error('GraphQL context initialization failed: missing request object.')
      }
      return { req: req as unknown as ExpressRequest }
    },
  }) as unknown as RequestHandler

  app.use('/graphql', graphqlHandler)

  app.listen(Number(port), (): void => {
    console.info(`🚀 Server ready at http://localhost:${port}/graphql`)
    console.info(`🔐 Auth endpoints at http://localhost:${port}/api/auth/*`)
  })
}

start().catch((err: unknown): void => {
  console.error('Failed to start server:', err)
})
