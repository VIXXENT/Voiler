import { useCallback, useSyncExternalStore } from 'react'

/** Storage key for the ID display toggle. */
const STORAGE_KEY = 'voiler:show-ids'

/** Read the current show-ids flag from localStorage. */
const getSnapshot = (): boolean => {
  const raw: string | null = globalThis.localStorage.getItem(STORAGE_KEY)
  return raw === 'true'
}

/** SSR-safe snapshot always returns false. */
const getServerSnapshot = (): boolean => false

/** Subscribe to storage events for cross-tab sync. */
const subscribe = (callback: () => void): (() => void) => {
  globalThis.addEventListener('storage', callback)
  return () => {
    globalThis.removeEventListener('storage', callback)
  }
}

/**
 * Hook to read the show-ids toggle state.
 * Syncs across tabs via the storage event.
 */
const useShowIds = (): boolean => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

/**
 * Toggle to control whether entity IDs are visible
 * throughout the application UI.
 * Persists state in localStorage.
 */
const IdDisplayToggle = () => {
  const showIds = useShowIds()

  const toggle = useCallback(() => {
    const next: string = showIds ? 'false' : 'true'
    globalThis.localStorage.setItem(STORAGE_KEY, next)
    globalThis.dispatchEvent(new Event('storage'))
  }, [showIds])

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-300">Entity ID Display</h3>
      <label
        className="flex cursor-pointer items-center gap-2
          text-sm text-gray-400"
      >
        <input
          type="checkbox"
          checked={showIds}
          onChange={toggle}
          className="h-3.5 w-3.5 rounded border-gray-600
            bg-gray-700 accent-indigo-500"
        />
        Show IDs in UI
      </label>
      <p className="text-xs text-gray-500">
        Components using useShowIds() will display entity identifiers when enabled.
      </p>
    </div>
  )
}

export { IdDisplayToggle, useShowIds }
