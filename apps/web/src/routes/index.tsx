import { Link, createFileRoute } from '@tanstack/react-router'

/** Landing page with app introduction and CTA buttons. */
const LandingPage = () => (
  <div className="flex flex-col items-center py-20 text-center">
    <h1 className="mb-4 text-5xl font-bold text-gray-900">Voiler</h1>
    <p className="mb-8 max-w-lg text-lg text-gray-600">
      AI-first fullstack boilerplate for modern web applications. Build faster with tRPC, Better
      Auth, and TanStack Start.
    </p>
    <div className="flex gap-4">
      <Link
        to="/auth/register"
        className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
      >
        Get Started
      </Link>
      <Link
        to="/auth/login"
        className="rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Login
      </Link>
    </div>
  </div>
)

// eslint-disable-next-line @typescript-eslint/typedef
const Route = createFileRoute('/')({
  component: LandingPage,
})

export { Route }
