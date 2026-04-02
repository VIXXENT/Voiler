import { authClient } from '~/lib/auth'

// TODO: i18n — replace hardcoded strings with t() calls
/**
 * Banner displayed at the top of the page when an admin
 * is impersonating another user. Shows the impersonated
 * user's name/email and a button to stop impersonating.
 */
const ImpersonationBanner = () => {
  const session = authClient.useSession()

  // Better Auth stores impersonation metadata on the
  // session. The `impersonatedBy` field is set when
  // an admin is impersonating another user.
  const impersonatedBy: string | undefined = (
    session.data?.session as Record<string, unknown> | undefined
  )?.impersonatedBy as string | undefined

  if (impersonatedBy === undefined) {
    return null
  }

  const userName: string =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    session.data?.user?.name ??
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    session.data?.user?.email ??
    'Unknown user'

  /** Stop the impersonation session and reload. */
  const handleStop: () => void = () => {
    void authClient.admin.stopImpersonating().then(() => {
      window.location.href = '/admin/users'
    })
  }

  return (
    <div className="flex items-center justify-center gap-4 bg-amber-400 px-4 py-2 text-sm font-medium text-amber-900">
      <span>
        Impersonating: <strong>{userName}</strong>
      </span>
      <button
        type="button"
        onClick={handleStop}
        className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
      >
        Stop Impersonating
      </button>
    </div>
  )
}

export { ImpersonationBanner }
