'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SessionUser, isSystemAdmin } from '@/lib/permission-utils'

export default function SelectBusinessPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/signin')
      return
    }

    const user = session.user as SessionUser

    // If user is system admin, redirect to dashboard
    if (isSystemAdmin(user)) {
      router.push('/dashboard')
      return
    }

    // Check if user has business memberships
    if (user.businessMemberships && user.businessMemberships.length > 0) {
      // Redirect to first active business or dashboard
      const activeMembership = user.businessMemberships.find(m => m.isActive)
      if (activeMembership) {
        router.push('/dashboard')
        return
      }
    }

    // If no business memberships, show selection or redirect
    router.push('/dashboard')
  }, [session, status, router])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center page-background">
      <div className="max-w-md w-full mx-4">
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">
            Welcome to Business Hub
          </h1>
          <p className="text-secondary mb-6">
            Setting up your business access...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    </div>
  )
}