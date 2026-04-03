import { useCallback, useState } from 'react'

/** Storage key for persisted log level configuration. */
const STORAGE_KEY = 'voiler:log-levels'

/** Log categories available for filtering. */
type LogCategory = 'api' | 'auth' | 'general' | 'router'

/** Map of log category to enabled state. */
interface LogLevels {
  readonly api: boolean
  readonly auth: boolean
  readonly general: boolean
  readonly router: boolean
}

/** Default log level configuration. */
const DEFAULT_LEVELS: LogLevels = {
  api: true,
  auth: false,
  general: true,
  router: true,
}

/**
 * Returns true if the parsed value has the shape of LogLevels,
 * narrowing the type without a bare cast.
 */
const isLogLevels = (value: unknown): value is LogLevels =>
  typeof value === 'object' &&
  value !== null &&
  'api' in value &&
  'auth' in value &&
  'general' in value &&
  'router' in value &&
  typeof (value as LogLevels).api === 'boolean' &&
  typeof (value as LogLevels).auth === 'boolean' &&
  typeof (value as LogLevels).general === 'boolean' &&
  typeof (value as LogLevels).router === 'boolean'

/** Read persisted log levels from localStorage. */
const readLevels = (): LogLevels => {
  const raw: string | null = globalThis.localStorage.getItem(STORAGE_KEY)
  if (raw === null) {
    return DEFAULT_LEVELS
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return isLogLevels(parsed) ? parsed : DEFAULT_LEVELS
  } catch {
    return DEFAULT_LEVELS
  }
}

/** Write log levels to localStorage. */
const writeLevels = (levels: LogLevels): void => {
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(levels))
}

/** Category labels for display. */
const CATEGORIES: readonly {
  readonly key: LogCategory
  readonly label: string
}[] = [
  { key: 'api', label: 'API' },
  { key: 'auth', label: 'Auth' },
  { key: 'router', label: 'Router' },
  { key: 'general', label: 'General' },
]

/**
 * Toggle console log levels per category.
 * Stores state in localStorage for persistence.
 * UI placeholder — actual log filtering integrates
 * with a future logging library.
 */
const LogLevelToggle = () => {
  const [levels, setLevels] = useState(readLevels)

  const toggle = useCallback(
    (category: LogCategory) => {
      const next: LogLevels = {
        ...levels,
        [category]: !levels[category],
      }
      writeLevels(next)
      setLevels(next)
    },
    [levels],
  )

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-300">Log Levels</h3>
      <div className="space-y-1">
        {CATEGORIES.map((cat) => (
          <label
            key={cat.key}
            className="flex cursor-pointer items-center gap-2
              text-sm text-gray-400"
          >
            <input
              type="checkbox"
              checked={levels[cat.key]}
              onChange={() => {
                toggle(cat.key)
              }}
              className="h-3.5 w-3.5 rounded border-gray-600
                bg-gray-700 accent-indigo-500"
            />
            {cat.label}
          </label>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        Filtering activates when a logging library is configured.
      </p>
    </div>
  )
}

export { LogLevelToggle, readLevels }
export type { LogCategory, LogLevels }
