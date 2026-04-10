import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes safely, resolving conflicts.
 * Drop-in replacement for classnames / clsx with Tailwind awareness.
 */
export const cn: (...inputs: ClassValue[]) => string = (...inputs) => twMerge(clsx(inputs))
