import { Link } from '@tanstack/react-router'
import { CreditCard, FolderOpen, LogOut, Settings } from 'lucide-react'

import { Avatar, AvatarFallback } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { authClient } from '~/lib/auth'
import { APP_NAME } from '~/lib/constants'
import { useTranslation } from '~/lib/i18n'

const navRoutes = [
  { to: '/projects', labelKey: 'nav.projects', icon: FolderOpen },
  { to: '/settings/billing', labelKey: 'nav.billing', icon: CreditCard },
  { to: '/settings/sessions', labelKey: 'nav.settings', icon: Settings },
] as const

const navBase = 'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium'
const navActive = `${navBase} bg-gray-100 text-gray-900`
const navInactive = `${navBase} text-gray-600 hover:bg-gray-100 hover:text-gray-900`

/** Sidebar navigation for the authenticated app shell. */
const Sidebar = () => {
  const session = authClient.useSession()
  const { t } = useTranslation()

  const userName: string = session.data?.user?.name ?? 'User'
  const userEmail: string = session.data?.user?.email ?? ''
  const initials: string = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-14 items-center px-4">
        <Link to="/" className="text-lg font-bold text-gray-900">
          {APP_NAME}
        </Link>
      </div>

      <Separator />

      <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
        {navRoutes.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: navActive }}
              inactiveProps={{ className: navInactive }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t({ key: item.labelKey })}
            </Link>
          )
        })}
      </nav>

      <Separator />

      <div className="flex items-center gap-3 px-3 py-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">{userName}</p>
          <p className="truncate text-xs text-gray-500">{userEmail}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-gray-500 hover:text-gray-900"
          onClick={() => void authClient.signOut()}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  )
}

export { Sidebar }
