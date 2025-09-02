'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BusinessModule, Permission, hasPermission, canAccessModule } from '@/lib/rbac'

interface ProtectedRouteProps {
  children: React.ReactNode
  module?: BusinessModule
  permission?: Permission
  requireAuth?: boolean
}

export function ProtectedRoute({ 
  children, 
  module, 
  permission, 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (requireAuth && !session) {
      router.push('/auth/signin')
      return
    }

    if (module && session) {
      const userPermissions = session.user.permissions || {}
      
      if (!canAccessModule(userPermissions, module)) {
        router.push('/unauthorized')
        return
      }

      if (permission && !hasPermission(userPermissions, module, permission)) {
        router.push('/unauthorized')
        return
      }
    }
  }, [session, status, router, module, permission, requireAuth])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (requireAuth && !session) {
    return null
  }

  return <>{children}</>
}