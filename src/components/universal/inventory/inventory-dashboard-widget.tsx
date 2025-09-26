'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface InventoryDashboardWidgetProps {
  businessId: string
  businessType: string
  showDetails?: boolean
  maxAlerts?: number
  refreshInterval?: number
}

interface DashboardStats {
  totalItems: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
  expiringCount: number
  criticalAlerts: Array<{
    id: string
    itemName: string
    alertType: string
    priority: string
    message: string
  }>
}

export function InventoryDashboardWidget({
  businessId,
  businessType,
  showDetails = true,
  maxAlerts = 5,
  refreshInterval = 300000 // 5 minutes
}: InventoryDashboardWidgetProps) {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)


  const fetchDashboardStats = async () => {
    try {
      setError(null)

      // Check authentication status before making API calls
      if (status !== 'authenticated') {
        return
      }

      // Fetch inventory stats and alerts in parallel
      const [itemsResponse, alertsResponse] = await Promise.all([
        fetch(`/api/inventory/${businessId}/items?limit=1000`),
        fetch(`/api/inventory/${businessId}/alerts?acknowledged=false&limit=${maxAlerts}`)
      ])

      if (!itemsResponse.ok || !alertsResponse.ok) {
        // Handle specific authentication errors
        if (itemsResponse.status === 401 || alertsResponse.status === 401) {
          throw new Error('Authentication required to access inventory data')
        }

        throw new Error(`Failed to fetch inventory data. Items: ${itemsResponse.status}, Alerts: ${alertsResponse.status}`)
      }

      const [itemsData, alertsData] = await Promise.all([
        itemsResponse.json(),
        alertsResponse.json()
      ])

      const items = itemsData.items || []
      const alerts = alertsData.alerts || []

      // Calculate dashboard statistics
      const totalItems = items.length
      const totalValue = items.reduce((sum: number, item: any) =>
        sum + (item.costPrice * item.currentStock), 0
      )

      const lowStockAlerts = alerts.filter((alert: any) => alert.alertType === 'low_stock')
      const outOfStockAlerts = alerts.filter((alert: any) => alert.alertType === 'out_of_stock')
      const expiringAlerts = alerts.filter((alert: any) =>
        alert.alertType === 'expiring_soon' || alert.alertType === 'expired'
      )

      const criticalAlerts = alerts
        .filter((alert: any) => alert.priority === 'critical')
        .slice(0, maxAlerts)
        .map((alert: any) => ({
          id: alert.id,
          itemName: alert.itemName,
          alertType: alert.alertType,
          priority: alert.priority,
          message: alert.message
        }))

      setStats({
        totalItems,
        totalValue,
        lowStockCount: lowStockAlerts.length,
        outOfStockCount: outOfStockAlerts.length,
        expiringCount: expiringAlerts.length,
        criticalAlerts
      })

      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching inventory dashboard stats:', error)
      setError('Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (businessId && status === 'authenticated' && session) {
      fetchDashboardStats()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [businessId, status, session])

  useEffect(() => {
    if (refreshInterval > 0 && status === 'authenticated' && session) {
      const interval = setInterval(fetchDashboardStats, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval, status, session])

  const getBusinessTypeIcon = (type: string) => {
    switch (type) {
      case 'restaurant': return '🍽️'
      case 'grocery': return '🛒'
      case 'clothing': return '👕'
      case 'hardware': return '🔧'
      default: return '📦'
    }
  }

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'low_stock': return '⚠️'
      case 'out_of_stock': return '🚫'
      case 'expiring_soon': return '⏰'
      case 'expired': return '❌'
      default: return '📋'
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{getBusinessTypeIcon(businessType)}</span>
          <h3 className="text-lg font-semibold text-primary">Inventory Overview</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{getBusinessTypeIcon(businessType)}</span>
          <h3 className="text-lg font-semibold text-primary">Inventory Overview</h3>
        </div>
        <div className="text-center py-4">
          <div className="text-yellow-600 mb-2">🔒 Authentication Required</div>
          <p className="text-sm text-secondary">Please sign in to view inventory data</p>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{getBusinessTypeIcon(businessType)}</span>
          <h3 className="text-lg font-semibold text-primary">Inventory Overview</h3>
        </div>
        <div className="text-center py-4">
          <div className="text-red-600 mb-2">⚠️ {error || 'No data available'}</div>
          <button
            onClick={fetchDashboardStats}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getBusinessTypeIcon(businessType)}</span>
          <h3 className="text-lg font-semibold text-primary">Inventory Overview</h3>
        </div>
        <Link
          href={`/${businessType}/inventory`}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          View All →
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalItems}</div>
            <div className="text-sm text-secondary">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalValue)}</div>
            <div className="text-sm text-secondary">Total Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.lowStockCount}</div>
            <div className="text-sm text-secondary">Low Stock</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.outOfStockCount}</div>
            <div className="text-sm text-secondary">Out of Stock</div>
          </div>
        </div>

        {/* Alerts Summary */}
        {showDetails && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-primary">Critical Alerts</h4>
              {stats.criticalAlerts.length > 0 && (
                <Link
                  href={`/${businessType}/inventory?tab=alerts`}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View All
                </Link>
              )}
            </div>

            {stats.criticalAlerts.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-sm text-secondary">No critical alerts</div>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.criticalAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  >
                    <span className="text-lg">{getAlertIcon(alert.alertType)}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-primary">{alert.itemName}</div>
                      <div className="text-xs text-secondary">{alert.message}</div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 rounded-full">
                      {alert.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Additional Stats for Different Business Types */}
        {showDetails && businessType === 'restaurant' && stats.expiringCount > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">⏰</span>
              <div>
                <div className="font-medium text-sm text-primary">
                  {stats.expiringCount} item{stats.expiringCount !== 1 ? 's' : ''} expiring soon
                </div>
                <div className="text-xs text-secondary">
                  Check expiration dates to minimize waste
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 flex gap-2">
          <Link
            href={`/${businessType}/inventory/add`}
            className="flex-1 py-2 px-3 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 text-center"
          >
            Add Item
          </Link>
          <Link
            href={`/${businessType}/inventory/receive`}
            className="flex-1 py-2 px-3 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 text-center"
          >
            Receive Stock
          </Link>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="mt-4 text-xs text-secondary text-center">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}