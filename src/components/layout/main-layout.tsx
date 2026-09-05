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
    // No top padding here — the global header (global-header.tsx) is
    // `sticky top-0` with h-14/h-16, not `fixed`, so it already reserves its
    // own height in normal document flow. pt-14/pt-16 here duplicated that
    // same height as extra padding, doubling the dead space between the
    // header and every page's content. The desktop sidebar below is
    // unaffected either way since it's `fixed` with an explicit `top-16`.
    <div className="flex min-h-screen page-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:top-16 lg:z-40 lg:w-64">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Main Content */}
      <main className="flex-1 lg:pl-64 min-w-0 [overflow-x:clip]">
        <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-3 pb-20">
          {children}
        </div>
      </main>
    </div>
  )
}