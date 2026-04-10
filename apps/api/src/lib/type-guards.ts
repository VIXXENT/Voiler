/**
 * Checks if a value is a non-null object (Record<string, unknown>).
 * Used for safe runtime type narrowing of unknown data.
 */
export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null
