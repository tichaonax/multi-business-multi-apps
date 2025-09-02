'use client'

import { useSession } from 'next-auth/react'
import { Sidebar } from './sidebar'
import { MobileSidebar } from './mobile-sidebar'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession()

  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="flex">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <MobileSidebar />
      <main className="flex-1 p-4 lg:p-6 lg:ml-0">
        {children}
      </main>
    </div>
  )
}