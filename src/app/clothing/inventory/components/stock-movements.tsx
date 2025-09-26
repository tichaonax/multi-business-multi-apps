'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface StockMovement {
  id: string
  movementType: 'PURCHASE_RECEIVED' | 'SALE' | 'RETURN_IN' | 'RETURN_OUT' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'DAMAGE' | 'THEFT' | 'EXPIRED'
  quantity: number
  unitCost?: number
  reference?: string
  reason?: string
  businessType: string
  attributes?: Record<string, any>
  createdAt: string
  productVariant: {
    id: string
    name?: string
    sku: string
    attributes?: Record<string, any>
    product: {
      name: string
      sku: string
      category?: {
        name: string
      }
      brand?: {
        name: string
      }
    }
  }
  employee?: {
    fullName: string
    employeeNumber: string
  }
}

interface ClothingStockMovementsProps {
  businessId: string
}

export function ClothingStockMovements({ businessId }: ClothingStockMovementsProps) {
  const { formatCurrency, formatDate } = useBusinessContext()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    movementType: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  })

  useEffect(() => {
    fetchMovements()
  }, [businessId, filters])

  const fetchMovements = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        businessId,
        limit: '50',
        includeProduct: 'true',
        includeEmployee: 'true'
      })

      if (filters.movementType) params.set('movementType', filters.movementType)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.search) params.set('search', filters.search)

      // Note: This would be a new API endpoint for stock movements
      // For now, simulating with sample data
      const sampleMovements: StockMovement[] = [
        {
          id: '1',
          movementType: 'SALE',
          quantity: -2,
          unitCost: 49.99,
          reference: 'CLO-20231213-0001',
          businessType: 'clothing',
          createdAt: new Date().toISOString(),
          productVariant: {
            id: 'var1',
            name: 'Medium Black',
            sku: 'MTS-001-M-BLK',
            attributes: { size: 'M', color: 'Black' },
            product: {
              name: "Men's Cotton T-Shirt",
              sku: 'MTS-001',
              category: { name: 'Men' },
              brand: { name: 'Generic' }
            }
          },
          employee: {
            fullName: 'John Doe',
            employeeNumber: 'EMP001'
          }
        },
        {
          id: '2',
          movementType: 'PURCHASE_RECEIVED',
          quantity: 50,
          unitCost: 25.00,
          reference: 'PO-2023-001',
          reason: 'New stock arrival',
          businessType: 'clothing',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          productVariant: {
            id: 'var2',
            name: 'Large White',
            sku: 'MTS-001-L-WHT',
            attributes: { size: 'L', color: 'White' },
            product: {
              name: "Men's Cotton T-Shirt",
              sku: 'MTS-001',
              category: { name: 'Men' },
              brand: { name: 'Generic' }
            }
          },
          employee: {
            fullName: 'Jane Smith',
            employeeNumber: 'EMP002'
          }
        },
        {
          id: '3',
          movementType: 'ADJUSTMENT',
          quantity: -1,
          reason: 'Damaged during handling',
          businessType: 'clothing',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          productVariant: {
            id: 'var3',
            name: 'Size 8 Floral',
            sku: 'WSD-002-8-FLR',
            attributes: { size: '8', pattern: 'Floral' },
            product: {
              name: "Women's Summer Dress",
              sku: 'WSD-002',
              category: { name: 'Women' },
              brand: { name: 'Zara' }
            }
          },
          employee: {
            fullName: 'Mike Johnson',
            employeeNumber: 'EMP003'
          }
        }
      ]

      setMovements(sampleMovements)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Failed to fetch stock movements:', err)
    } finally {
      setLoading(false)
    }
  }

  const getMovementTypeConfig = (type: string) => {
    const configs = {
      'PURCHASE_RECEIVED': { icon: '📦', color: 'text-green-600', bg: 'bg-green-50', label: 'Purchase Received' },
      'SALE': { icon: '💰', color: 'text-blue-600', bg: 'bg-blue-50', label: 'Sale' },
      'RETURN_IN': { icon: '↩️', color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Return In' },
      'RETURN_OUT': { icon: '↪️', color: 'text-orange-600', bg: 'bg-orange-50', label: 'Return Out' },
      'ADJUSTMENT': { icon: '⚖️', color: 'text-purple-600', bg: 'bg-purple-50', label: 'Adjustment' },
      'TRANSFER_IN': { icon: '⬅️', color: 'text-teal-600', bg: 'bg-teal-50', label: 'Transfer In' },
      'TRANSFER_OUT': { icon: '➡️', color: 'text-gray-600', bg: 'bg-gray-50', label: 'Transfer Out' },
      'DAMAGE': { icon: '🔨', color: 'text-red-600', bg: 'bg-red-50', label: 'Damage' },
      'THEFT': { icon: '🚨', color: 'text-red-800', bg: 'bg-red-100', label: 'Theft' },
      'EXPIRED': { icon: '⏰', color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Expired' }
    }

    return configs[type as keyof typeof configs] || {
      icon: '📋',
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      label: type
    }
  }

  const movementTypes = [
    { value: '', label: 'All Movement Types' },
    { value: 'PURCHASE_RECEIVED', label: 'Purchases' },
    { value: 'SALE', label: 'Sales' },
    { value: 'RETURN_IN', label: 'Returns In' },
    { value: 'RETURN_OUT', label: 'Returns Out' },
    { value: 'ADJUSTMENT', label: 'Adjustments' },
    { value: 'DAMAGE', label: 'Damage' },
    { value: 'THEFT', label: 'Theft' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load stock movements: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.movementType}
            onChange={(e) => setFilters(prev => ({ ...prev, movementType: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {movementTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="From Date"
          />

          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="To Date"
          />

          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search products, SKU, reference..."
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Movements List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Stock Movements</h3>
          <p className="text-sm text-gray-600 mt-1">Track all inventory changes and transactions</p>
        </div>

        {movements.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Stock Movements</h3>
            <p className="text-gray-600">Stock movements will appear here as inventory changes.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {movements.map((movement) => {
              const config = getMovementTypeConfig(movement.movementType)
              const isPositive = movement.quantity > 0

              return (
                <div key={movement.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Movement Type Icon */}
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <span className="text-lg">{config.icon}</span>
                      </div>

                      {/* Movement Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{config.label}</h4>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {isPositive ? '+' : ''}{movement.quantity}
                          </span>
                        </div>

                        <div className="mt-1">
                          <p className="text-sm text-gray-900 font-medium">
                            {movement.productVariant.product.name}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span>SKU: {movement.productVariant.sku}</span>
                            {movement.productVariant.attributes?.size && (
                              <span>Size: {movement.productVariant.attributes.size}</span>
                            )}
                            {movement.productVariant.attributes?.color && (
                              <span>Color: {movement.productVariant.attributes.color}</span>
                            )}
                          </div>
                        </div>

                        {movement.reason && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Reason:</span> {movement.reason}
                          </p>
                        )}

                        {movement.reference && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Reference:</span> {movement.reference}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Movement Metadata */}
                    <div className="text-right">
                      <div className="text-sm text-gray-900">
                        {formatDate(new Date(movement.createdAt))}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {movement.employee?.fullName || 'System'}
                      </div>
                      {movement.unitCost && (
                        <div className="text-sm font-medium text-gray-900 mt-1">
                          {formatCurrency(movement.unitCost)} each
                        </div>
                      )}
                      {movement.unitCost && (
                        <div className="text-xs text-gray-600">
                          Total: {formatCurrency(Math.abs(movement.quantity) * movement.unitCost)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}