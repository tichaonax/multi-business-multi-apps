'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { LivestockPurchaseWizard } from '@/components/livestock-purchase/LivestockPurchaseWizard'
import { LivestockReprintHistory } from '@/components/livestock-purchase/LivestockReprintHistory'

export default function GroceryLivestockPurchasePage() {
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const [showWizard, setShowWizard] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || !currentBusinessId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/grocery/pos"
          className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ← Back to POS
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Livestock Purchase</h1>
          {currentBusiness?.businessName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{currentBusiness.businessName}</p>
          )}
        </div>
      </div>

      <div className="max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Weigh livestock from a vendor, add each animal category, and submit to record the purchase against the expense account.
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="w-full py-3 text-base font-semibold bg-orange-600 text-white rounded-xl hover:bg-orange-700"
          >
            Start New Purchase
          </button>
        </div>
      </div>

      <LivestockReprintHistory key={historyKey} businessId={currentBusinessId} businessType="grocery" />

      {showWizard && (
        <LivestockPurchaseWizard
          businessId={currentBusinessId}
          businessType="grocery"
          onClose={() => { setShowWizard(false); setHistoryKey(k => k + 1) }}
        />
      )}
    </div>
  )
}
