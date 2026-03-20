'use client'

import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Sidebar } from './sidebar'
import { MobileSidebar } from './mobile-sidebar'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const isPopup = searchParams.get('popup') === '1'

  // No BusinessPermissionsProvider here - it's already provided by RootLayout
  if (!session) {
    return <div className="min-h-screen page-background">{children}</div>
  }

  // Popup mode: opened via window.open — render content only, no sidebar or nav
  if (isPopup) {
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
      <main className="flex-1 lg:pl-64 min-w-0 [overflow-x:clip] [overflow-y:clip]">
        <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-3">
          {children}
        </div>
      </main>
    </div>
  )
}