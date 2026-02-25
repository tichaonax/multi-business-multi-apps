'use client'

/**
 * POSSettingsHub
 * Unified POS settings hub — renders sections based on the current user's permissions.
 *
 * Sections:
 *  1. 🖨️ Receipt Printer Preferences  — canPrintReceipts || canSelectPrinters  (per-user, localStorage)
 *  2. 📊 Sales Performance Thresholds — canManageBusinessSettings               (business-wide, DB)
 *
 * System admins see all sections.
 * Users with no qualifying permission see the locked/empty state (page-level guard
 * prevents them reaching this component, but we defend in depth).
 */

import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { PrinterPreferencesSettings } from './PrinterPreferencesSettings'
import { SalesPerformanceSettings } from './SalesPerformanceSettings'
import { SessionUser } from '@/lib/permission-utils'

interface POSSettingsHubProps {
  businessId: string
  businessType: 'restaurant' | 'grocery' | 'clothing' | 'hardware'
  posLink: string
}

export function POSSettingsHub({ businessId, businessType, posLink }: POSSettingsHubProps) {
  const { data: session } = useSession()
  const { hasPermission } = useBusinessPermissionsContext()

  const sessionUser = session?.user as SessionUser
  const isSystemAdmin = sessionUser?.role === 'admin'

  const canSeePrinterPrefs =
    isSystemAdmin ||
    hasPermission('canViewBusiness')

  const canSeeThresholds =
    isSystemAdmin ||
    hasPermission('canManageBusinessSettings')

  const hasAnything = canSeePrinterPrefs || canSeeThresholds

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

  return (
    <div className="space-y-10">

      {/* ── Section 1: Receipt Printer Preferences ─────────────────── */}
      {canSeePrinterPrefs && (
        <section>
          <PrinterPreferencesSettings businessType={businessType} posLink={posLink} />
        </section>
      )}

      {/* ── Divider between sections (only when both visible) ────── */}
      {canSeePrinterPrefs && canSeeThresholds && (
        <hr className="border-gray-200 dark:border-gray-700" />
      )}

      {/* ── Section 2: Sales Performance Thresholds ──────────────── */}
      {canSeeThresholds && (
        <section>
          {/* Section header — mirrors the printer section style */}
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
  )
}
