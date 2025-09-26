'use client'

import { useSession } from 'next-auth/react'
import { Sidebar } from './sidebar'
import { MobileSidebar } from './mobile-sidebar'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession()

  // No BusinessPermissionsProvider here - it's already provided by RootLayout
  if (!session) {
    return <div className="min-h-screen page-background">{children}</div>
  }

  return (
    <div className="flex min-h-screen page-background pt-14 sm:pt-16">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:top-16 lg:z-40 lg:w-64">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Main Content */}
      <main className="flex-1 lg:pl-64">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-4 lg:py-6">
          {children}
        </div>
      </main>
    </div>
  )
}