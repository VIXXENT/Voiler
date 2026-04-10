import { cn } from '~/lib/utils'

/** Animated circular loading indicator. */
const Spinner = ({ className }: { readonly className?: string }) => (
  <div
    className={cn(
      'h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
      className,
    )}
    role="status"
    aria-label="Loading"
  />
)

export { Spinner }
