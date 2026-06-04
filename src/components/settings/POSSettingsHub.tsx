'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { PrinterPreferencesSettings } from './PrinterPreferencesSettings'
import { SalesPerformanceSettings } from './SalesPerformanceSettings'
import { ScaleSettings } from './ScaleSettings'
import { WeightPricingSettings } from './WeightPricingSettings'
import { SessionUser } from '@/lib/permission-utils'

interface POSSettingsHubProps {
  businessId: string
  businessType: 'restaurant' | 'grocery' | 'clothing' | 'hardware'
  posLink: string
}

type TabKey = 'printing' | 'scale'

export function POSSettingsHub({ businessId, businessType, posLink }: POSSettingsHubProps) {
  const { data: session } = useSession()
  const { hasPermission } = useBusinessPermissionsContext()
  const [activeTab, setActiveTab] = useState<TabKey>('printing')

  const sessionUser = session?.user as SessionUser
  const isSystemAdmin = sessionUser?.role === 'admin'

  const canSeePrinterPrefs = isSystemAdmin || hasPermission('canViewBusiness')
  const canSeeThresholds = isSystemAdmin || hasPermission('canManageBusinessSettings')
  const canSeeScale = isSystemAdmin || hasPermission('canManageBusinessSettings')
  const hasScale = businessType === 'restaurant' || businessType === 'grocery'

  const hasAnything = canSeePrinterPrefs || canSeeThresholds || canSeeScale

  if (!hasAnything) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <div className="text-5xl">🔒</div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          You don&apos;t have access to any POS settings for this business.
        </p>
        <a href={posLink} className="text-blue-600 hover:underline text-sm">
          ← Back to POS
        </a>
      </div>
    )
  }

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: 'printing', label: '🖨️ Printing & Performance', show: canSeePrinterPrefs || canSeeThresholds },
    { key: 'scale',   label: '⚖️ Scale & Weighing',        show: canSeeScale && hasScale },
  ]

  const visibleTabs = tabs.filter(t => t.show)

  return (
    <div>
      {/* Tab bar */}
      {visibleTabs.length > 1 && (
        <div className="flex gap-1 mb-8 border-b border-gray-200 dark:border-gray-700">
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-gray-900 border border-b-white dark:border-b-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab: Printing & Performance ─────────────────────────────── */}
      {activeTab === 'printing' && (
        <div className="space-y-10">
          {canSeePrinterPrefs && (
            <section>
              <PrinterPreferencesSettings businessType={businessType} posLink={posLink} />
            </section>
          )}

          {canSeePrinterPrefs && canSeeThresholds && (
            <hr className="border-gray-200 dark:border-gray-700" />
          )}

          {canSeeThresholds && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">📊</span>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Sales Performance Thresholds</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Business-wide — affects the performance badge for all staff at this business.
                  </p>
                </div>
              </div>
              <SalesPerformanceSettings
                businessId={businessId}
                businessType={businessType}
                posLink={posLink}
              />
            </section>
          )}
        </div>
      )}

      {/* ── Tab: Scale & Weighing ───────────────────────────────────── */}
      {activeTab === 'scale' && canSeeScale && hasScale && (
        <div className="space-y-10">

          {/* Scale Hardware */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">⚖️</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Scale Hardware — MG-S8200</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  RS-232 serial connection. COM port saved per device and auto-restores on login.
                </p>
              </div>
            </div>
            <ScaleSettings businessId={businessId} />
          </section>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Selling Presets */}
          <section>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🛒</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Selling Presets</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Prices you charge customers per kg. Assign a preset to any inventory item so the scale auto-prices it at the POS.
                </p>
              </div>
            </div>
            <WeightPricingSettings businessId={businessId} section="sale" />
          </section>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Vendor Purchase Presets */}
          <section>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🚚</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Vendor Purchase Presets</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Prices you pay suppliers per kg. Used in the livestock / goods purchase workflow.
                </p>
              </div>
            </div>
            <WeightPricingSettings businessId={businessId} section="purchase" />
          </section>

        </div>
      )}
    </div>
  )
}
