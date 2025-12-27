'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface R710Alert {
  businessId: string
  businessName: string
  businessType: string
  deviceIp: string
  deviceStatus: string
  lastHealthCheck: Date | null
  failures: {
    id: string
    syncType: string
    status: string
    errorMessage: string | null
    syncedAt: Date
    tokensChecked: number
    tokensUpdated: number
  }[]
  totalFailures: number
  lastFailureAt: Date
}

interface R710AlertsSummary {
  totalAlerts: number
  totalFailures: number
  byStatus: {
    ERROR: number
    DEVICE_UNREACHABLE: number
  }
  bySyncType: {
    TOKEN_SYNC: number
    AUTO_GENERATION: number
    HEALTH_CHECK: number
  }
  timeRange: {
    from: Date
    to: Date
  }
}

export function R710AlertsWidget() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<R710Alert[]>([])
  const [summary, setSummary] = useState<R710AlertsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    loadR710Alerts()
  }, [])

  const loadR710Alerts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/r710/alerts', {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
        setSummary(data.summary || null)
      }
    } catch (error) {
      console.error('Failed to load R710 alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSyncTypeLabel = (syncType: string) => {
    switch (syncType) {
      case 'TOKEN_SYNC':
        return 'Token Sync'
      case 'AUTO_GENERATION':
        return 'Auto-Generate'
      case 'HEALTH_CHECK':
        return 'Health Check'
      default:
        return syncType
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'ERROR') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          ❌ Error
        </span>
      )
    } else if (status === 'DEVICE_UNREACHABLE') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          ⚠️ Unreachable
        </span>
      )
    }
    return null
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  // Don't show anything if loading or no alerts
  if (loading || alerts.length === 0) {
    return null
  }

  const criticalAlerts = alerts.filter(
    (alert) => alert.failures.some(f => f.status === 'ERROR')
  )
  const warningAlerts = alerts.filter(
    (alert) => !criticalAlerts.includes(alert) && alert.failures.some(f => f.status === 'DEVICE_UNREACHABLE')
  )

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-md">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
            R710 WiFi Portal Issues
          </h3>

          <p className="text-sm text-red-800 dark:text-red-300 mb-3">
            {criticalAlerts.length > 0 && (
              <span className="font-medium">
                {criticalAlerts.length} {criticalAlerts.length === 1 ? 'business has' : 'businesses have'} critical sync errors.{' '}
              </span>
            )}
            {warningAlerts.length > 0 && (
              <span>
                {warningAlerts.length} {warningAlerts.length === 1 ? 'device is' : 'devices are'} unreachable.{' '}
              </span>
            )}
            {summary && (
              <span className="text-xs">
                ({summary.totalFailures} failures in last 24 hours)
              </span>
            )}
          </p>

          {/* Show top 3 alerts by default */}
          <div className="space-y-2">
            {alerts.slice(0, expanded ? undefined : 3).map((alert) => (
              <div
                key={alert.businessId}
                className="bg-white dark:bg-gray-800 rounded-md p-3 border border-red-100 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/10 cursor-pointer transition-colors"
                onClick={() => router.push('/r710-portal')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {alert.businessName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({alert.deviceIp})
                      </span>
                    </div>

                    {/* Show most recent failure */}
                    {alert.failures[0] && (
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusBadge(alert.failures[0].status)}
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {getSyncTypeLabel(alert.failures[0].syncType)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {formatTimeAgo(alert.failures[0].syncedAt)}
                        </span>
                      </div>
                    )}

                    {alert.failures[0]?.errorMessage && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                        {alert.failures[0].errorMessage}
                      </p>
                    )}
                  </div>

                  {alert.totalFailures > 1 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-200 text-red-900 dark:bg-red-800/50 dark:text-red-200 ml-2">
                      {alert.totalFailures} failures
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Show more/less button */}
          {alerts.length > 3 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
              className="mt-3 text-sm text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-medium"
            >
              {expanded ? '▲ Show Less' : `▼ Show ${alerts.length - 3} More`}
            </button>
          )}

          {/* View All button */}
          <div className="mt-4 pt-3 border-t border-red-200 dark:border-red-800">
            <button
              onClick={() => router.push('/r710-portal')}
              className="text-sm text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 font-medium hover:underline"
            >
              View R710 Portal →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
