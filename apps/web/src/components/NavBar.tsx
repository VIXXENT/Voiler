import { Link } from '@tanstack/react-router'

import { LocaleSwitcher } from '~/components/LocaleSwitcher'
import { authClient, sessionRole } from '~/lib/auth'
import type { AppRole } from '~/lib/auth'
import { useTranslation } from '~/lib/i18n'

/** Navigation bar showing auth state and navigation links. */
const NavBar = () => {
  const session = authClient.useSession()
  const { t } = useTranslation()

  const isAuthenticated = Boolean(session.data)

  const userRole: AppRole | undefined = sessionRole({ user: session.data?.user })

  const isAdmin: boolean = userRole === 'admin'

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-gray-900">
          {t({ key: 'app.name' })}
        </Link>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {t({ key: 'nav.dashboard' })}
              </Link>
              <Link
                to="/settings/sessions"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {t({ key: 'nav.sessions' })}
              </Link>
              {isAdmin && (
                <Link
                  to="/admin/users"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  {t({ key: 'nav.admin' })}
                </Link>
              )}
              <span className="text-sm text-gray-600">
                {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
                {session.data?.user?.name ?? 'User'}
              </span>
              <LocaleSwitcher />
              <button
                type="button"
                onClick={() => void authClient.signOut()}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                {t({ key: 'nav.signOut' })}
              </button>
            </>
          ) : (
            <>
              <LocaleSwitcher />
              <Link
                to="/auth/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {t({ key: 'nav.login' })}
              </Link>
              <Link
                to="/auth/register"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                {t({ key: 'nav.register' })}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export { NavBar }
