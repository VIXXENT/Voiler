import { useCallback, useEffect, useState } from 'react'

import { IdDisplayToggle } from './tools/IdDisplayToggle'
import { LogLevelToggle } from './tools/LogLevelToggle'
import { RequestInspector } from './tools/RequestInspector'

import { authClient, sessionRole } from '~/lib/auth'
import type { AppRole } from '~/lib/auth'

/** Roles allowed to access the dev menu. */
const ALLOWED_ROLES: ReadonlySet<AppRole> = new Set<AppRole>(['admin', 'dev'])

/**
 * Developer panel accessible via Ctrl+Shift+D.
 * Self-gates based on user role — only renders for
 * admin and dev users. Slides in from the right edge.
 */
const DevMenu = () => {
  const [open, setOpen] = useState(false)

  const session = authClient.useSession()

  const userRole: AppRole | undefined = sessionRole({ user: session.data?.user })

  const hasAccess: boolean = userRole !== undefined && ALLOWED_ROLES.has(userRole)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault()
      setOpen((prev: boolean) => !prev)
    }
  }, [])

  useEffect(() => {
    globalThis.addEventListener('keydown', handleKeyDown)
    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  if (!hasAccess) {
    return null
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40
            transition-opacity"
          onClick={() => {
            setOpen(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
            }
          }}
          role="button"
          tabIndex={-1}
          aria-label="Close dev menu"
        />
      )}

      {/* Slide-out panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex
          h-full w-80 flex-col border-l
          border-gray-700 bg-gray-900
          text-gray-100 shadow-2xl
          transition-transform duration-200 ease-in-out ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between
            border-b border-gray-700 px-4 py-3"
        >
          <h2
            className="text-sm font-bold uppercase
            tracking-wider text-indigo-400"
          >
            Dev Tools
          </h2>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
            }}
            className="rounded p-1 text-gray-400
              hover:bg-gray-800 hover:text-gray-200"
            aria-label="Close dev menu"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tools */}
        <div
          className="flex-1 space-y-6 overflow-y-auto
          p-4"
        >
          <LogLevelToggle />
          <hr className="border-gray-700" />
          <IdDisplayToggle />
          <hr className="border-gray-700" />
          <RequestInspector />
        </div>

        {/* Footer */}
        <div
          className="border-t border-gray-700 px-4
            py-2 text-xs text-gray-600"
        >
          Ctrl+Shift+D to toggle
        </div>
      </div>
    </>
  )
}

export { DevMenu }
