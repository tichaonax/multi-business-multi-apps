'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { isSystemAdmin } from '@/lib/permission-utils'

interface BusinessTypeRouteProps {
  children: React.ReactNode
  requiredBusinessType: string | string[]
  requireAuth?: boolean
}

export function BusinessTypeRoute({
  children,
  requiredBusinessType,
  requireAuth = true
}: BusinessTypeRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  const {
    currentBusiness,
    isAuthenticated,
    loading: businessLoading
  } = useBusinessPermissionsContext()

  useEffect(() => {
    if (status === 'loading' || businessLoading) return

    // console.log('🔐 BusinessTypeRoute Check:', {
    //   requiredType: requiredBusinessType,
    //   currentBusiness: currentBusiness ? {
    //     name: currentBusiness.businessName,
    //     type: currentBusiness.businessType
    //   } : null,
    //   isAuthenticated,
    //   userRole: session?.users?.role
    // })

    if (requireAuth && !session) {
      // console.log('❌ Not authenticated, redirecting to signin')
      router.push('/auth/signin')
      return
    }

    if (requireAuth && !isAuthenticated) {
      // console.log('❌ Not authenticated in business context, redirecting to signin')
      router.push('/auth/signin')
      return
    }

    // System admins have access to all modules
    if (session?.user && isSystemAdmin(session.user as any)) {
      // console.log('✅ System admin access granted')
      return
    }

    // Check if user has access to current business
    if (!currentBusiness) {
      // console.log('❌ No current business selected, redirecting to dashboard')
      router.push('/dashboard')
      return
    }

    // Check if current business type matches required type(s)
    const currentBusinessType = currentBusiness.businessType?.toLowerCase()
    const allowedTypes = Array.isArray(requiredBusinessType) ? requiredBusinessType : [requiredBusinessType]
    if (!allowedTypes.includes(currentBusinessType)) {
      // console.log('❌ Business type mismatch:', {
      //   current: currentBusinessType,
      //   required: requiredBusinessType
      // })
      router.push('/dashboard')
      return
    }

    // console.log('✅ Access granted to', requiredBusinessType, 'module')

  }, [session, status, router, requiredBusinessType, requireAuth, currentBusiness, isAuthenticated, businessLoading])

  if (status === 'loading' || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (requireAuth && !session) {
    return null
  }

  if (requireAuth && !isAuthenticated) {
    return null
  }

  return <>{children}</>
}