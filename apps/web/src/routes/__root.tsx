import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Outlet, createRootRoute } from '@tanstack/react-router'
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
  // eslint-disable-next-line @typescript-eslint/typedef
  const [queryClient] = useState(() => new QueryClient())
  /* eslint-disable @typescript-eslint/typedef,
     @typescript-eslint/no-unsafe-assignment,
     @typescript-eslint/no-unsafe-return */
  const [trpcClient] = useState(() => createTrpcClient())
  /* eslint-enable @typescript-eslint/typedef,
     @typescript-eslint/no-unsafe-assignment,
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
        </I18nProvider>
      </QueryClientProvider>
      <DevMenu />
      {/* @ts-expect-error — tRPC Provider collision */}
    </trpc.Provider>
  )
}

// eslint-disable-next-line @typescript-eslint/typedef
const Route = createRootRoute({
  component: RootLayout,
})

export { Route }
