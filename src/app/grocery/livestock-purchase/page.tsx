'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useScale } from '@/contexts/ScaleContext'
import { ScaleSettings } from '@/components/settings/ScaleSettings'
import { LivestockPurchaseWizard } from '@/components/livestock-purchase/LivestockPurchaseWizard'
import { LivestockReprintHistory } from '@/components/livestock-purchase/LivestockReprintHistory'

type PurchaseType = 'LIVESTOCK' | 'GOODS'

const TABS: { key: PurchaseType; label: string; emoji: string; description: string }[] = [
  { key: 'LIVESTOCK', label: 'Livestock', emoji: '🐄', description: 'Weigh whole animals (chickens, goats, cattle). Price is calculated per kg from vendor-negotiated unit prices.' },
  { key: 'GOODS', label: 'Goods', emoji: '🥦', description: 'Weigh produce and commodities (beef, vegetables, tomatoes). Price is set directly in $/kg.' },
]

export default function GroceryLivestockPurchasePage() {
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const { isElectron, isConnected } = useScale()
  const [showWizard, setShowWizard] = useState(false)
  const [activeTab, setActiveTab] = useState<PurchaseType>('LIVESTOCK')
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

  // In Electron: scale must be connected to weigh
  if (isElectron && !isConnected) {
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
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Vendor Purchase</h1>
            {currentBusiness?.businessName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{currentBusiness.businessName}</p>
            )}
          </div>
        </div>
        <div className="max-w-md">
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">⚖️ Scale not connected</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              A connected MG-S8200 scale is required to weigh purchases. Configure it below — once set up it will auto-connect on every launch.
            </p>
          </div>
          <ScaleSettings businessId={currentBusinessId} />
        </div>
      </div>
    )
  }

  const activeTabConfig = TABS.find(t => t.key === activeTab)!

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
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Vendor Purchase</h1>
          {currentBusiness?.businessName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{currentBusiness.businessName}</p>
          )}
        </div>
      </div>

      <div className="max-w-lg space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-xl p-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{activeTabConfig.description}</p>
          <button
            onClick={() => setShowWizard(true)}
            className="w-full py-3 text-base font-semibold bg-orange-600 text-white rounded-xl hover:bg-orange-700"
          >
            Start New {activeTabConfig.label} Purchase
          </button>
        </div>
      </div>

      <LivestockReprintHistory key={historyKey} businessId={currentBusinessId} businessType="grocery" />

      {showWizard && (
        <LivestockPurchaseWizard
          businessId={currentBusinessId}
          businessType="grocery"
          purchaseType={activeTab}
          onClose={() => { setShowWizard(false); setHistoryKey(k => k + 1) }}
        />
      )}
    </div>
  )
}
