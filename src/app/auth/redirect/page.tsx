'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

const POS_ROLES = ['pos', 'restaurant-associate', 'grocery-associate', 'clothing-associate', 'salesperson']

const POS_ROUTES: Record<string, string> = {
  restaurant: '/restaurant/pos',
  grocery: '/grocery/pos',
  clothing: '/clothing/pos',
}

export default function PostLoginRedirect() {
  const { data: session, status } = useSession()
  const { currentBusiness, loading: businessLoading } = useBusinessPermissionsContext()
  const router = useRouter()

  useEffect(() => {
    // Wait until both session and business context are fully loaded
    if (status === 'loading' || businessLoading) return

    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
      return
    }

    const role = (session?.user as any)?.role ?? ''

    if (POS_ROLES.includes(role)) {
      const businessType = currentBusiness?.businessType ?? ''
      router.replace(POS_ROUTES[businessType] ?? '/universal/pos')
    } else {
      router.replace('/dashboard')
    }
  }, [status, businessLoading, session, currentBusiness])

  return (
    <div className="min-h-screen flex items-center justify-center page-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}
