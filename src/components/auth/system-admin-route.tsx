'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SessionUser, isSystemAdmin } from '@/lib/permission-utils'

interface SystemAdminRouteProps {
  children: React.ReactNode
  fallbackComponent?: React.ReactNode
  redirectTo?: string
}

export function SystemAdminRoute({
  children,
  fallbackComponent,
  redirectTo = '/dashboard',
}: SystemAdminRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    const user = session.user as SessionUser

    if (!isSystemAdmin(user)) {
      router.push(redirectTo)
      return
    }
  }, [session, status, router, redirectTo])

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!session?.user) {
    return null
  }

  const user = session.user as SessionUser

  // Check if user is system admin
  if (!isSystemAdmin(user)) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>
    }

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">System Admin Access Required</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this system administration area.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}