import type { ReactNode } from 'react'

interface PageHeaderProps {
  readonly title: string
  readonly description?: string
  readonly actions?: ReactNode
}

/** Section header with title/description on left and optional actions on right. */
const PageHeader = (props: PageHeaderProps) => {
  const { title, description, actions } = props

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
        {description !== undefined && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {actions !== undefined && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  )
}

export { PageHeader }
export type { PageHeaderProps }
