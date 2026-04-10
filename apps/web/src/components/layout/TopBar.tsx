import type { ReactNode } from 'react'

interface TopBarProps {
  readonly title: string
  readonly description?: string
  readonly actions?: ReactNode
}

/** Top bar for pages that need a page-level header with title and optional actions. */
const TopBar = (props: TopBarProps) => {
  const { title, description, actions } = props

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-gray-900">{title}</h1>
        {description !== undefined && (
          <p className="truncate text-sm text-gray-500">{description}</p>
        )}
      </div>
      {actions !== undefined && (
        <div className="ml-4 flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  )
}

export { TopBar }
export type { TopBarProps }
