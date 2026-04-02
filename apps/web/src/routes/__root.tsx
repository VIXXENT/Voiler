import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Outlet, createRootRoute } from '@tanstack/react-router'

import { NavBar } from '~/components/NavBar'
import { createTrpcClient, trpc } from '~/lib/trpc'
import '~/styles.css'

// eslint-disable-next-line @typescript-eslint/typedef
const queryClient = new QueryClient()

// eslint-disable-next-line @typescript-eslint/typedef, @typescript-eslint/no-unsafe-assignment
const trpcClient = createTrpcClient()

/** Root layout wrapping the app with tRPC and React Query providers. */
const RootLayout = () => (
  // @ts-expect-error — tRPC Provider collision with cross-package AppRouter
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
    {/* @ts-expect-error — tRPC Provider collision */}
  </trpc.Provider>
)

// eslint-disable-next-line @typescript-eslint/typedef
const Route = createRootRoute({
  component: RootLayout,
})

export { Route }
