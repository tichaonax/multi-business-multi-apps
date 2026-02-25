'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { POSSettingsHub } from '@/components/settings/POSSettingsHub'
import { SessionUser } from '@/lib/permission-utils'

export default function RestaurantPosSettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness, hasPermission, loading } = useBusinessPermissionsContext()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  const sessionUser = session?.user as SessionUser
  const isAdmin = sessionUser?.role === 'admin'
  const canAccess =
    isAdmin ||
    hasPermission('canViewBusiness')

  if (!isMounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">🔒</div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">You don&apos;t have permission to manage POS settings.</p>
          <Link href="/restaurant/pos" className="text-blue-600 hover:underline text-sm">← Back to POS</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/restaurant/pos"
          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          ← Back to POS
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">⚙️ POS Settings</h1>
          {currentBusiness?.businessName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{currentBusiness.businessName}</p>
          )}
        </div>
      </div>

      {currentBusinessId ? (
        <POSSettingsHub
          businessId={currentBusinessId}
          businessType="restaurant"
          posLink="/restaurant/pos"
        />
      ) : (
        <p className="text-sm text-gray-500">No business selected.</p>
      )}
    </div>
  )
}
