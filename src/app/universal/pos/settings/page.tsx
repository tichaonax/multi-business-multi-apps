'use client'

// A business-type-agnostic POS Settings page — restaurant/grocery/clothing/
// hardware each have their own dedicated /{type}/settings/pos route, but
// every OTHER business type (vehicle_service, services, construction,
// consulting, retail, and any future type) had no path to this at all: no
// way to register a Print Terminal, set a personal or business-wide default
// printer, or reach any of what POSSettingsHub offers. This page fills that
// gap for anyone POSSettingsHub's own type-specific gating (hasScale, etc.)
// already handles correctly — it just needs a route and a business context
// to render against, which every business has via currentBusinessId.

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { POSSettingsHub } from '@/components/settings/POSSettingsHub'
import { SessionUser } from '@/lib/permission-utils'

export default function UniversalPosSettingsPage() {
  const { data: session } = useSession()
  const { currentBusinessId, currentBusiness, hasPermission, loading } = useBusinessPermissionsContext()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => { setIsMounted(true) }, [])

  const sessionUser = session?.user as SessionUser
  const isAdmin = sessionUser?.role === 'admin'
  const canAccess = isAdmin || hasPermission('canViewBusiness')

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
          <Link href="/universal/pos" className="text-blue-600 hover:underline text-sm">← Back to POS</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/universal/pos"
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
          businessType={currentBusiness?.businessType || 'other'}
          posLink="/universal/pos"
        />
      ) : (
        <p className="text-sm text-gray-500">No business selected.</p>
      )}
    </div>
  )
}
