'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ExpiryAlertsWidgetProps {
  businessId?: string
}

interface AlertItem {
  batchId: string
  name: string
  quantity: number
  expiryDate: string | null
  daysUntilExpiry: number | null
}

interface AlertsData {
  expired: AlertItem[]
  nearExpiry: AlertItem[]
  counts: { expiredCount: number; nearExpiryCount: number }
}

export function ExpiryAlertsWidget({ businessId }: ExpiryAlertsWidgetProps) {
  const [data, setData] = useState<AlertsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) { setLoading(false); return }

    const fetchAlerts = async () => {
      try {
        const res = await fetch(`/api/expiry/alerts?businessId=${businessId}`)
        if (!res.ok) return
        const json = await res.json()
        if (json.success) setData({ expired: json.data.expired, nearExpiry: json.data.nearExpiry, counts: json.counts })
      } catch {
        // silently fail — widget is non-critical
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [businessId])

  if (loading || !businessId) return null
  if (!data) return null

  const { expired, nearExpiry, counts } = data
  const total = counts.expiredCount + counts.nearExpiryCount
  if (total === 0) return null

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Show up to 3 expired first, then near-expiry to fill to 5
  const topItems = [
    ...expired.slice(0, 3),
    ...nearExpiry.slice(0, Math.max(0, 5 - Math.min(expired.length, 3))),
  ].slice(0, 5)

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗓️</span>
          <h3 className="font-semibold text-red-900 dark:text-red-300 text-sm">Expiry Alerts</h3>
          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300">
            {total}
          </span>
        </div>
        <Link
          href="/expiry"
          className="text-xs text-red-700 dark:text-red-400 hover:underline font-medium"
        >
          Manage →
        </Link>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
        {counts.expiredCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            {counts.expiredCount} expired
          </span>
        )}
        {counts.nearExpiryCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            {counts.nearExpiryCount} expiring soon
          </span>
        )}
      </div>

      {/* Item rows */}
      <ul className="divide-y divide-gray-100 dark:divide-gray-700">
        {topItems.map((item) => {
          const isExpired = item.daysUntilExpiry !== null && item.daysUntilExpiry < 0
          return (
            <li key={item.batchId} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">{isExpired ? '🚨' : '⚠️'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.quantity} unit{item.quantity !== 1 ? 's' : ''} · expires {formatDate(item.expiryDate)}
                  </p>
                </div>
              </div>
              <span className={`ml-3 flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                isExpired
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                  : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
              }`}>
                {isExpired
                  ? `${Math.abs(item.daysUntilExpiry!)}d ago`
                  : item.daysUntilExpiry === 0
                    ? 'today'
                    : `${item.daysUntilExpiry}d left`}
              </span>
            </li>
          )
        })}
      </ul>

      {total > 5 && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-center">
          <Link href="/expiry" className="text-xs text-red-600 dark:text-red-400 hover:underline">
            +{total - 5} more — view all
          </Link>
        </div>
      )}
    </div>
  )
}
