import { Link } from '@tanstack/react-router'

import { authClient } from '~/lib/auth'

/** Navigation bar showing auth state and navigation links. */
const NavBar = () => {
  // eslint-disable-next-line @typescript-eslint/typedef
  const session = authClient.useSession()

  const isAuthenticated: boolean = Boolean(session.data)

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-gray-900">
          Voiler
        </Link>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-600">
                {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
                {session.data?.user?.name ?? 'User'}
              </span>
              <button
                type="button"
                onClick={() => void authClient.signOut()}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                Login
              </Link>
              <Link
                to="/auth/register"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export { NavBar }
