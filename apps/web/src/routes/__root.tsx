import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useState } from 'react'

import { DevMenu } from '~/components/dev-menu/DevMenu'
import { ImpersonationBanner } from '~/components/ImpersonationBanner'
import { NavBar } from '~/components/NavBar'
import { I18nProvider } from '~/lib/i18n'
import { createTrpcClient, trpc } from '~/lib/trpc'
import '~/styles.css'

/**
 * Root layout wrapping the app with tRPC and React Query providers.
 * Clients are created inside useState to avoid SSR cross-request leakage.
 */
const RootLayout = () => {
  const [queryClient] = useState(() => new QueryClient())
  /* eslint-disable @typescript-eslint/no-unsafe-assignment,
     @typescript-eslint/no-unsafe-return */
  const [trpcClient] = useState(() => createTrpcClient())
  /* eslint-enable @typescript-eslint/no-unsafe-assignment,
     @typescript-eslint/no-unsafe-return */

  return (
    // @ts-expect-error — tRPC Provider collision with cross-package AppRouter
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <div className="min-h-screen bg-gray-50">
            <ImpersonationBanner />
            <NavBar />
            <main className="container mx-auto px-4 py-8">
              <Outlet />
            </main>
          </div>
          <DevMenu />
        </I18nProvider>
      </QueryClientProvider>
      {/* @ts-expect-error — tRPC Provider collision */}
    </trpc.Provider>
  )
}

/**
 * Fallback error UI rendered when an unhandled error
 * propagates out of any child route.
 */
const RootErrorComponent = (props: ErrorComponentProps) => {
  const { error } = props
  const message: string = error instanceof Error ? error.message : 'An unexpected error occurred.'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4">
      <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
      <p className="max-w-md text-center text-sm text-gray-600">{message}</p>
      <a
        href="/"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Go back
      </a>
    </div>
  )
}

const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RootErrorComponent,
})

export { Route }
