'use client'

import { useState, useEffect } from 'react'

interface LowStockAlert {
  id: string
  businessId: string
  alertType: 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired' | 'overstock' | 'price_change'
  priority: 'critical' | 'high' | 'medium' | 'low'
  itemId: string
  itemName: string
  itemSku: string
  category: string
  currentStock: number
  threshold?: number
  unit: string
  message: string
  actionRequired: string
  value?: number
  expirationDate?: string
  daysUntilExpiration?: number
  isAcknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
  createdAt: string
  updatedAt: string
}

interface UniversalLowStockAlertsProps {
  businessId: string
  businessType?: string
  alertTypes?: string[]
  priorities?: string[]
  maxAlerts?: number
  showFilters?: boolean
  showSummary?: boolean
  onAlertClick?: (alert: LowStockAlert) => void
  onAcknowledge?: (alertIds: string[]) => void
  layout?: 'full' | 'compact' | 'minimal'
  autoRefresh?: boolean
  refreshInterval?: number
}

export function UniversalLowStockAlerts({
  businessId,
  businessType = 'restaurant',
  alertTypes = ['low_stock', 'out_of_stock', 'expiring_soon', 'expired'],
  priorities = ['critical', 'high', 'medium', 'low'],
  maxAlerts = 50,
  showFilters = true,
  showSummary = true,
  onAlertClick,
  onAcknowledge,
  layout = 'full',
  autoRefresh = false,
  refreshInterval = 60000
}: UniversalLowStockAlertsProps) {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([])

  // Filter states
  const [alertTypeFilter, setAlertTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<string>('unacknowledged')
  const [categoryFilter, setCategoryFilter] = useState<string>('')

  // Fetch alerts
  const fetchAlerts = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        limit: maxAlerts.toString(),
        ...(alertTypeFilter !== 'all' && { alertType: alertTypeFilter }),
        ...(priorityFilter !== 'all' && { priority: priorityFilter }),
        ...(acknowledgedFilter !== 'all' && { acknowledged: acknowledgedFilter === 'acknowledged' ? 'true' : 'false' }),
        ...(categoryFilter && { category: categoryFilter })
      })

      const response = await fetch(`/api/inventory/${businessId}/alerts?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const data = await response.json()
      setAlerts(data.alerts || [])

    } catch (error) {
      console.error('Error fetching alerts:', error)
      setError('Failed to load alerts')
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (businessId) {
      fetchAlerts()
    }
  }, [businessId, alertTypeFilter, priorityFilter, acknowledgedFilter, categoryFilter, maxAlerts])

  // Auto refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchAlerts, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const handleAcknowledge = async (alertIds: string[]) => {
    try {
      const response = await fetch(`/api/inventory/${businessId}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge',
          alertIds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to acknowledge alerts')
      }

      // Refresh alerts after acknowledgment
      await fetchAlerts()
      setSelectedAlerts([])

      if (onAcknowledge) {
        onAcknowledge(alertIds)
      }

    } catch (error) {
      console.error('Error acknowledging alerts:', error)
      setError('Failed to acknowledge alerts')
    }
  }

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'low_stock': return '⚠️'
      case 'out_of_stock': return '🚫'
      case 'expiring_soon': return '⏰'
      case 'expired': return '❌'
      case 'overstock': return '📈'
      case 'price_change': return '💲'
      default: return '📋'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getAlertTypeColor = (alertType: string) => {
    switch (alertType) {
      case 'out_of_stock': return 'text-red-600'
      case 'expired': return 'text-red-700'
      case 'low_stock': return 'text-orange-600'
      case 'expiring_soon': return 'text-yellow-600'
      case 'overstock': return 'text-purple-600'
      case 'price_change': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const calculateSummary = () => {
    const summary = {
      total: alerts.length,
      unacknowledged: alerts.filter(a => !a.isAcknowledged).length,
      critical: alerts.filter(a => a.priority === 'critical').length,
      high: alerts.filter(a => a.priority === 'high').length,
      totalValue: alerts.filter(a => a.value).reduce((sum, a) => sum + (a.value || 0), 0),
      byType: {
        low_stock: alerts.filter(a => a.alertType === 'low_stock').length,
        out_of_stock: alerts.filter(a => a.alertType === 'out_of_stock').length,
        expiring_soon: alerts.filter(a => a.alertType === 'expiring_soon').length,
        expired: alerts.filter(a => a.alertType === 'expired').length
      }
    }
    return summary
  }

  const summary = calculateSummary()

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded mb-3"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">⚠️ {error}</div>
        <button
          onClick={fetchAlerts}
          className="btn-primary text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {showSummary && layout === 'full' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-sm text-secondary">Total Alerts</div>
            <div className="text-xl font-bold text-primary">{summary.total}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-secondary">Unacknowledged</div>
            <div className="text-xl font-bold text-orange-600">{summary.unacknowledged}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-secondary">Critical</div>
            <div className="text-xl font-bold text-red-600">{summary.critical}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-secondary">Value at Risk</div>
            <div className="text-xl font-bold text-primary">${summary.totalValue.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && layout === 'full' && (
  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
          <select
            value={alertTypeFilter}
            onChange={(e) => setAlertTypeFilter(e.target.value)}
            className="input-field text-sm"
          >
            <option value="all">All Types</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="overstock">Overstock</option>
            <option value="price_change">Price Changes</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input-field text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={acknowledgedFilter}
            onChange={(e) => setAcknowledgedFilter(e.target.value)}
            className="input-field text-sm"
          >
            <option value="unacknowledged">Unacknowledged</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="all">All</option>
          </select>

          <input
            type="text"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="Filter by category..."
            className="input-field text-sm w-full sm:w-48"
          />

          {autoRefresh && (
            <button
              onClick={fetchAlerts}
              className="btn-secondary text-sm"
              title="Refresh alerts"
            >
              🔄 Refresh
            </button>
          )}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedAlerts.length > 0 && layout === 'full' && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm text-blue-800">
            {selectedAlerts.length} alert{selectedAlerts.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => handleAcknowledge(selectedAlerts)}
            className="btn-primary text-sm"
          >
            Acknowledge Selected
          </button>
          <button
            onClick={() => setSelectedAlerts([])}
            className="btn-secondary text-sm"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`card p-4 border-l-4 ${getPriorityColor(alert.priority)} ${
              alert.isAcknowledged ? 'opacity-60' : ''
            } ${onAlertClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            onClick={() => onAlertClick?.(alert)}
          >
            <div className="flex flex-col sm:flex-row items-start sm:justify-between">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {layout === 'full' && (
                  <input
                    type="checkbox"
                    checked={selectedAlerts.includes(alert.id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      if (e.target.checked) {
                        setSelectedAlerts([...selectedAlerts, alert.id])
                      } else {
                        setSelectedAlerts(selectedAlerts.filter(id => id !== alert.id))
                      }
                    }}
                    className="mt-1"
                  />
                )}

                <div className="text-2xl">
                  {getAlertIcon(alert.alertType)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-primary truncate">{alert.itemName}</span>
                    <span className="text-sm text-secondary">({alert.itemSku})</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getAlertTypeColor(alert.alertType)}`}>
                      {alert.alertType.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-sm text-secondary mb-2 truncate">{alert.message}</div>

                  <div className="text-sm font-medium text-orange-600 truncate">Action: {alert.actionRequired}</div>

                  {layout === 'full' && (
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-secondary">
                      <div className="truncate">Category: {alert.category}</div>
                      <div className="truncate">Stock: {alert.currentStock} {alert.unit}</div>
                      {alert.threshold && <div className="truncate">Threshold: {alert.threshold} {alert.unit}</div>}
                      {alert.value && <div className="truncate">Value: ${alert.value.toFixed(2)}</div>}
                      {alert.expirationDate && (
                        <div className="truncate">Expires: {new Date(alert.expirationDate).toLocaleDateString()}</div>
                      )}
                      {alert.daysUntilExpiration !== undefined && (
                        <div className={`font-medium truncate ${
                          alert.daysUntilExpiration <= 1 ? 'text-red-600' :
                          alert.daysUntilExpiration <= 3 ? 'text-orange-600' : 'text-yellow-600'
                        }`}>
                          {alert.daysUntilExpiration === 0 ? 'Expires today' :
                           alert.daysUntilExpiration === 1 ? 'Expires tomorrow' :
                           `${alert.daysUntilExpiration} days until expiration`}
                        </div>
                      )}
                    </div>
                  )}

                  {alert.isAcknowledged && (
                    <div className="mt-2 text-xs text-green-600">
                      ✓ Acknowledged by {alert.acknowledgedBy} on {formatDate(alert.acknowledgedAt!)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getPriorityColor(alert.priority)}`}>
                  {alert.priority}
                </span>

                {layout === 'full' && !alert.isAcknowledged && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAcknowledge([alert.id])
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Acknowledge
                  </button>
                )}

                <div className="text-xs text-secondary text-right">
                  {formatDate(alert.createdAt)}
                </div>
              </div>
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-primary mb-2">All clear!</h3>
            <p className="text-secondary">
              {acknowledgedFilter === 'acknowledged'
                ? 'No acknowledged alerts match your filters'
                : 'No active alerts found'
              }
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions Summary for Compact Layout */}
      {layout === 'compact' && summary.unacknowledged > 0 && (
        <div className="card p-4 bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-orange-800">
                {summary.unacknowledged} unacknowledged alert{summary.unacknowledged !== 1 ? 's' : ''}
              </div>
              <div className="text-sm text-orange-600">
                {summary.critical > 0 && `${summary.critical} critical, `}
                {summary.byType.out_of_stock > 0 && `${summary.byType.out_of_stock} out of stock`}
              </div>
            </div>
            <button
              onClick={() => handleAcknowledge(alerts.filter(a => !a.isAcknowledged).map(a => a.id))}
              className="btn-primary text-sm"
            >
              Acknowledge All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}