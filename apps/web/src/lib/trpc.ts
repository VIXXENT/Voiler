import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@voiler/api/src/trpc/router.js'

/**
 * tRPC React hooks bound to the API router type.
 *
 * The createTRPCReact collision check triggers a false
 * positive when AppRouter is imported cross-package.
 * This does not affect runtime behaviour.
 * TODO(plan-d): resolve cross-package tRPC type export.
 */
// eslint-disable-next-line @typescript-eslint/typedef
const trpc = createTRPCReact<AppRouter>()

/**
 * Custom fetch wrapper that includes credentials
 * for cross-origin cookie support.
 */
// eslint-disable-next-line max-params
const fetchWithCredentials: typeof fetch = (input, init) =>
  fetch(input, { ...init, credentials: 'include' })

/** Create a configured tRPC client with credentials. */
/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
const createTrpcClient = () =>
  // @ts-expect-error — false collision from cross-package AppRouter
  trpc.createClient({
    links: [
      httpBatchLink({
        url: `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/trpc`,
        fetch: fetchWithCredentials,
      }),
    ],
  })
/* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */

export { createTrpcClient, trpc }
