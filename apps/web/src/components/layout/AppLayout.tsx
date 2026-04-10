import type { ReactNode } from 'react'

import { Sidebar } from './Sidebar'

interface AppLayoutProps {
  readonly children: ReactNode
}

/** Main layout wrapper for authenticated pages — sidebar on left, content on right. */
const AppLayout = (props: AppLayoutProps) => {
  const { children } = props

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-auto">{children}</div>
    </div>
  )
}

export { AppLayout }
export type { AppLayoutProps }
