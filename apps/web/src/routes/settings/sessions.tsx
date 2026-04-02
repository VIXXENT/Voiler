import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { authClient } from '~/lib/auth'

/** Shape of a session returned by Better Auth. */
interface SessionEntry {
  readonly token: string
  readonly userAgent: string | null
  readonly createdAt: string | Date
  readonly current?: boolean
}

/** Active sessions management page. */
const SessionsPage = () => {
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)
  const [revoking, setRevoking] = useState<string | null>(null)

  /**
   * Load sessions from the auth client.
   * Called on initial mount via useEffect.
   */
  const loadSessions: () => Promise<void> = async () => {
    setLoading(true)
    setError(undefined)
    // eslint-disable-next-line @typescript-eslint/typedef
    const result = await authClient.listSessions()
    if (result.error) {
      setError((result.error as { message?: string }).message ?? 'Failed to load sessions')
    } else {
      setSessions((result.data as SessionEntry[] | null) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadSessions()
  }, [])

  /** Revoke a single session by token. */
  const handleRevoke: (params: { token: string }) => Promise<void> = async (params) => {
    setRevoking(params.token)
    await authClient.revokeSession({ token: params.token })
    await loadSessions()
    setRevoking(null)
  }

  /** Revoke all sessions except the current one. */
  const handleRevokeAll: () => Promise<void> = async () => {
    setRevoking('all')
    await authClient.revokeOtherSessions()
    await loadSessions()
    setRevoking(null)
  }

  /**
   * Format a date value for display.
   */
  const formatDate: (params: { value: string | Date }) => string = (params) => {
    const d: Date = typeof params.value === 'string' ? new Date(params.value) : params.value
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * Extract browser/device info from a user agent
   * string. Returns a short human-readable label.
   */
  const parseUserAgent: (params: { ua: string | null }) => string = (params) => {
    if (params.ua === null || params.ua === '') {
      return 'Unknown device'
    }
    if (params.ua.includes('Chrome')) {
      return 'Chrome'
    }
    if (params.ua.includes('Firefox')) {
      return 'Firefox'
    }
    if (params.ua.includes('Safari')) {
      return 'Safari'
    }
    if (params.ua.includes('Edge')) {
      return 'Edge'
    }
    return 'Browser'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Active Sessions</h1>
        <p className="text-sm text-gray-500">Loading sessions...</p>
      </div>
    )
  }

  if (error !== undefined) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Active Sessions</h1>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Active Sessions</h1>
        {sessions.length > 1 && (
          <button
            type="button"
            disabled={revoking !== null}
            onClick={() => void handleRevokeAll()}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {revoking === 'all' ? 'Revoking...' : 'Revoke All Others'}
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-gray-500">No active sessions found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Device / Browser
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sessions.map((session: SessionEntry) => (
                <tr key={session.token}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {parseUserAgent({
                      ua: session.userAgent,
                    })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate({
                      value: session.createdAt,
                    })}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {session.current === true ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                        Current
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 text-xs font-semibold leading-5 text-gray-600">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    {session.current !== true && (
                      <button
                        type="button"
                        disabled={revoking !== null}
                        onClick={() =>
                          void handleRevoke({
                            token: session.token,
                          })
                        }
                        className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {revoking === session.token ? 'Revoking...' : 'Revoke'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/typedef
const Route = createFileRoute('/settings/sessions')({
  beforeLoad: async () => {
    // eslint-disable-next-line @typescript-eslint/typedef
    const session = await authClient.getSession()
    if (!session.data) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: '/auth/login' })
    }
  },
  component: SessionsPage,
})

export { Route }
