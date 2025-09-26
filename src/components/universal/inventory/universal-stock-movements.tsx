'use client'

import { useState, useEffect } from 'react'

interface StockMovement {
  id: string
  businessId: string
  itemId: string
  itemName: string
  itemSku: string
  movementType: 'receive' | 'use' | 'waste' | 'adjustment' | 'transfer' | 'return'
  quantity: number
  unit: string
  unitCost?: number
  totalCost?: number
  previousStock: number
  newStock: number
  reason?: string
  notes?: string
  employeeName?: string
  supplierName?: string
  referenceNumber?: string
  batchNumber?: string
  expirationDate?: string
  location?: string
  createdAt: string
}

interface UniversalStockMovementsProps {
  businessId: string
  itemId?: string
  showFilters?: boolean
  maxItems?: number
  onMovementClick?: (movement: StockMovement) => void
  layout?: 'full' | 'compact'
}

export function UniversalStockMovements({
  businessId,
  itemId,
  showFilters = true,
  maxItems = 100,
  onMovementClick,
  layout = 'full'
}: UniversalStockMovementsProps) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('7days')
  const [employeeFilter, setEmployeeFilter] = useState<string>('')

  // Fetch movements
  useEffect(() => {
    const fetchMovements = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          limit: maxItems.toString(),
          ...(itemId && { itemId }),
          ...(movementTypeFilter !== 'all' && { movementType: movementTypeFilter }),
          ...(employeeFilter && { employeeName: employeeFilter })
        })

        // Add date range filter
        if (dateRangeFilter !== 'all') {
          const now = new Date()
          let startDate = new Date()

          switch (dateRangeFilter) {
            case '1day':
              startDate.setDate(now.getDate() - 1)
              break
            case '7days':
              startDate.setDate(now.getDate() - 7)
              break
            case '30days':
              startDate.setDate(now.getDate() - 30)
              break
            case '90days':
              startDate.setDate(now.getDate() - 90)
              break
          }

          params.append('startDate', startDate.toISOString())
          params.append('endDate', now.toISOString())
        }

        const response = await fetch(`/api/inventory/${businessId}/movements?${params}`)

        if (!response.ok) {
          throw new Error('Failed to fetch stock movements')
        }

        const data = await response.json()
        setMovements(data.movements || [])

      } catch (error) {
        console.error('Error fetching stock movements:', error)
        setError('Failed to load stock movements')
        setMovements([])
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchMovements()
    }
  }, [businessId, itemId, movementTypeFilter, dateRangeFilter, employeeFilter, maxItems])

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'receive': return '📦'
      case 'use': return '🔄'
      case 'waste': return '🗑️'
      case 'adjustment': return '⚖️'
      case 'transfer': return '🔀'
      case 'return': return '↩️'
      default: return '📋'
    }
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'receive': return 'text-green-600'
      case 'use': return 'text-blue-600'
      case 'waste': return 'text-red-600'
      case 'adjustment': return 'text-yellow-600'
      case 'transfer': return 'text-purple-600'
      case 'return': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const getQuantityDisplay = (movement: StockMovement) => {
    const isPositive = movement.quantity > 0
    const color = isPositive ? 'text-green-600' : 'text-red-600'
    const sign = isPositive ? '+' : ''

    return (
      <span className={`font-medium ${color}`}>
        {sign}{movement.quantity} {movement.unit}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const calculateSummary = () => {
    const summary = {
      totalMovements: movements.length,
      totalValue: 0,
      byType: {
        receive: 0,
        use: 0,
        waste: 0,
        adjustment: 0,
        transfer: 0,
        return: 0
      }
    }

    movements.forEach(movement => {
      if (movement.totalCost) {
        summary.totalValue += movement.totalCost
      }
      summary.byType[movement.movementType]++
    })

    return summary
  }

  const summary = calculateSummary()

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded mb-2"></div>
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
          onClick={() => window.location.reload()}
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
      {layout === 'full' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-sm text-secondary">Total Movements</div>
            <div className="text-xl font-bold text-primary">{summary.totalMovements}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-secondary">Total Value</div>
            <div className="text-xl font-bold text-primary">${summary.totalValue.toFixed(2)}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-secondary">Received</div>
            <div className="text-xl font-bold text-green-600">{summary.byType.receive}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-secondary">Used</div>
            <div className="text-xl font-bold text-blue-600">{summary.byType.use}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <select
            value={movementTypeFilter}
            onChange={(e) => setMovementTypeFilter(e.target.value)}
            className="input-field text-sm"
          >
            <option value="all">All Types</option>
            <option value="receive">Received</option>
            <option value="use">Used</option>
            <option value="waste">Waste</option>
            <option value="adjustment">Adjustments</option>
            <option value="transfer">Transfers</option>
            <option value="return">Returns</option>
          </select>

          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value)}
            className="input-field text-sm"
          >
            <option value="1day">Last 24 Hours</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          <input
            type="text"
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            placeholder="Filter by employee..."
            className="input-field text-sm w-full sm:w-48"
          />
        </div>
      )}

      {/* Movements List */}
      <div className="card">
        {layout === 'full' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left p-2 sm:p-3 font-medium text-secondary">Date/Time</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-secondary">Item</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-secondary">Type</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-secondary">Quantity</th>
                  <th className="hidden sm:table-cell text-left p-3 font-medium text-secondary">Stock Change</th>
                  <th className="hidden md:table-cell text-left p-3 font-medium text-secondary">Cost</th>
                  <th className="hidden lg:table-cell text-left p-3 font-medium text-secondary">Employee</th>
                  <th className="hidden xl:table-cell text-left p-3 font-medium text-secondary">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {movements.map((movement) => (
                  <tr
                    key={movement.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${onMovementClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onMovementClick?.(movement)}
                  >
                    <td className="p-2 sm:p-3">
                      <div className="text-sm">
                        {formatDate(movement.createdAt)}
                      </div>
                    </td>
                    <td className="p-2 sm:p-3">
                      <div>
                        <div className="font-medium text-primary">{movement.itemName}</div>
                        <div className="text-xs text-secondary">{movement.itemSku}</div>
                        {/* Show collapsed info on mobile */}
                        <div className="sm:hidden text-xs text-secondary mt-1">
                          {movement.previousStock} → {movement.newStock} {movement.unit}
                          {movement.totalCost && ` • $${movement.totalCost.toFixed(2)}`}
                        </div>
                      </div>
                    </td>
                    <td className="p-2 sm:p-3">
                      <div className={`flex items-center gap-1 sm:gap-2 ${getMovementTypeColor(movement.movementType)}`}>
                        <span>{getMovementTypeIcon(movement.movementType)}</span>
                        <span className="capitalize hidden sm:inline">{movement.movementType}</span>
                      </div>
                    </td>
                    <td className="p-2 sm:p-3">
                      {getQuantityDisplay(movement)}
                    </td>
                    <td className="hidden sm:table-cell p-3">
                      <div className="text-sm">
                        <div>{movement.previousStock} → {movement.newStock}</div>
                        <div className="text-xs text-secondary">{movement.unit}</div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell p-3">
                      {movement.totalCost ? (
                        <div className="font-medium">
                          ${movement.totalCost.toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell p-3 text-secondary">
                      {movement.employeeName || '—'}
                    </td>
                    <td className="hidden xl:table-cell p-3">
                      <div className="text-xs space-y-1">
                        {movement.reason && (
                          <div className="font-medium">{movement.reason}</div>
                        )}
                        {movement.supplierName && (
                          <div className="text-blue-600">Supplier: {movement.supplierName}</div>
                        )}
                        {movement.referenceNumber && (
                          <div className="text-gray-600">Ref: {movement.referenceNumber}</div>
                        )}
                        {movement.batchNumber && (
                          <div className="text-gray-600">Batch: {movement.batchNumber}</div>
                        )}
                        {movement.location && (
                          <div className="text-gray-600">📍 {movement.location}</div>
                        )}
                        {movement.notes && (
                          <div className="text-gray-500 italic">{movement.notes}</div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Compact layout
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {movements.map((movement) => (
              <div
                key={movement.id}
                className={`p-4 ${onMovementClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}`}
                onClick={() => onMovementClick?.(movement)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg ${getMovementTypeColor(movement.movementType)}`}>
                      {getMovementTypeIcon(movement.movementType)}
                    </span>
                    <div>
                      <div className="font-medium text-primary">{movement.itemName}</div>
                      <div className="text-sm text-secondary">
                        {getQuantityDisplay(movement)} • {movement.movementType}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {movement.totalCost ? `$${movement.totalCost.toFixed(2)}` : '—'}
                    </div>
                    <div className="text-xs text-secondary">
                      {formatDate(movement.createdAt)}
                    </div>
                  </div>
                </div>
                {(movement.reason || movement.notes) && (
                  <div className="mt-2 text-sm text-secondary">
                    {movement.reason} {movement.notes && `• ${movement.notes}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {movements.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-primary mb-2">No movements found</h3>
            <p className="text-secondary">
              No stock movements match your current filters
            </p>
          </div>
        )}
      </div>

      {/* Load More */}
      {movements.length >= maxItems && (
        <div className="text-center">
          <button
            onClick={() => {
              // In a real implementation, this would load more items
              console.log('Load more movements')
            }}
            className="btn-secondary"
          >
            Load More Movements
          </button>
        </div>
      )}
    </div>
  )
}