import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Suspense } from 'react'

import { ErrorBoundary } from '~/components/ErrorBoundary'
import { AppLayout } from '~/components/layout'
import { Spinner } from '~/components/ui/spinner'
import { authClient } from '~/lib/auth'

/** Pathless layout route for authenticated app pages. Redirects to login if no session. */
const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    // Skip auth check during SSR — authClient.getSession() has no request headers
    // server-side and always returns null. The client re-runs beforeLoad after
    // hydration with actual browser cookies.
    if (typeof window === 'undefined') {
      return
    }

    const session = await authClient.getSession()
    if (!session.data) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/auth/login' })
    }
  },
  component: () => (
    <AppLayout>
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-16">
              <Spinner className="h-6 w-6" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </AppLayout>
  ),
})

export { Route }
