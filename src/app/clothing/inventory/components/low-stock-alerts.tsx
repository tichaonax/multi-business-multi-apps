'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface LowStockItem {
  id: string
  productId: string
  variantId?: string
  productName: string
  sku: string
  currentStock: number
  reorderLevel: number
  reorderQuantity?: number
  unitCost?: number
  supplier?: {
    id: string
    name: string
    contactInfo?: string
  }
  attributes?: {
    size?: string
    color?: string
    condition?: string
    [key: string]: any
  }
  lastRestocked?: string
  avgSalesPerWeek?: number
  daysUntilOutOfStock?: number
}

interface ClothingLowStockAlertsProps {
  businessId: string
}

export function ClothingLowStockAlerts({ businessId }: ClothingLowStockAlertsProps) {
  const { formatCurrency, formatDate } = useBusinessContext()
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [alertLevel, setAlertLevel] = useState<'critical' | 'warning' | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  useEffect(() => {
    fetchLowStockItems()
  }, [businessId, alertLevel])

  const fetchLowStockItems = async () => {
    try {
      setLoading(true)
      setError(null)

      // This would be a real API call to fetch low stock items
      // For now, using sample data
      const sampleLowStockItems: LowStockItem[] = [
        {
          id: '1',
          productId: 'prod1',
          variantId: 'var1',
          productName: "Men's Cotton T-Shirt",
          sku: 'MTS-001-M-BLK',
          currentStock: 2,
          reorderLevel: 10,
          reorderQuantity: 50,
          unitCost: 15.99,
          supplier: {
            id: 'sup1',
            name: 'Cotton Co.',
            contactInfo: 'orders@cottonco.com'
          },
          attributes: {
            size: 'M',
            color: 'Black',
            condition: 'NEW'
          },
          lastRestocked: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          avgSalesPerWeek: 3,
          daysUntilOutOfStock: 5
        },
        {
          id: '2',
          productId: 'prod2',
          variantId: 'var2',
          productName: "Women's Summer Dress",
          sku: 'WSD-002-8-FLR',
          currentStock: 0,
          reorderLevel: 5,
          reorderQuantity: 25,
          unitCost: 29.99,
          supplier: {
            id: 'sup2',
            name: 'Fashion Forward Ltd.',
            contactInfo: 'supply@fashionforward.com'
          },
          attributes: {
            size: '8',
            color: 'Floral',
            condition: 'NEW'
          },
          lastRestocked: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          avgSalesPerWeek: 1,
          daysUntilOutOfStock: 0
        },
        {
          id: '3',
          productId: 'prod3',
          variantId: 'var3',
          productName: "Kids' Winter Jacket",
          sku: 'KWJ-003-10-RED',
          currentStock: 7,
          reorderLevel: 15,
          reorderQuantity: 30,
          unitCost: 45.00,
          supplier: {
            id: 'sup3',
            name: 'KidsWear Direct',
            contactInfo: 'orders@kidswear.com'
          },
          attributes: {
            size: '10',
            color: 'Red',
            condition: 'NEW'
          },
          lastRestocked: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          avgSalesPerWeek: 2,
          daysUntilOutOfStock: 21
        },
        {
          id: '4',
          productId: 'prod4',
          productName: "Vintage Leather Jacket",
          sku: 'VLJ-004-L-BRN',
          currentStock: 1,
          reorderLevel: 3,
          unitCost: 89.99,
          attributes: {
            size: 'L',
            color: 'Brown',
            condition: 'USED'
          },
          lastRestocked: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          avgSalesPerWeek: 0.5,
          daysUntilOutOfStock: 14
        }
      ]

      setLowStockItems(sampleLowStockItems)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Failed to fetch low stock items:', err)
    } finally {
      setLoading(false)
    }
  }

  const getAlertPriority = (item: LowStockItem) => {
    if (item.currentStock === 0) return 'critical'
    if (item.currentStock <= item.reorderLevel / 2) return 'critical'
    if (item.currentStock <= item.reorderLevel) return 'warning'
    return 'normal'
  }

  const getAlertConfig = (priority: string) => {
    const configs = {
      critical: {
        icon: '🚨',
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        badge: 'bg-red-100 text-red-800'
      },
      warning: {
        icon: '⚠️',
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        badge: 'bg-orange-100 text-orange-800'
      },
      normal: {
        icon: '📦',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-800'
      }
    }
    return configs[priority as keyof typeof configs] || configs.normal
  }

  const filteredItems = lowStockItems.filter(item => {
    const priority = getAlertPriority(item)
    if (alertLevel === 'critical' && priority !== 'critical') return false
    if (alertLevel === 'warning' && priority === 'normal') return false
    return true
  })

  const handleCreatePurchaseOrder = (item: LowStockItem) => {
    console.log('Creating purchase order for:', item)
    // Would redirect to purchase order creation page or open modal
  }

  const handleContactSupplier = (supplier: { id: string; name: string; contactInfo?: string }) => {
    if (supplier.contactInfo) {
      if (supplier.contactInfo.includes('@')) {
        window.open(`mailto:${supplier.contactInfo}`, '_blank')
      } else {
        window.open(`tel:${supplier.contactInfo}`, '_blank')
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Failed to load low stock alerts: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Alert Level</label>
            <select
              value={alertLevel}
              onChange={(e) => setAlertLevel(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Alerts</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warning & Critical</option>
            </select>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-100 border border-red-200 rounded"></span>
              <span className="text-gray-600">Critical ({filteredItems.filter(i => getAlertPriority(i) === 'critical').length})</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></span>
              <span className="text-gray-600">Warning ({filteredItems.filter(i => getAlertPriority(i) === 'warning').length})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Low Stock Alerts</h3>
            <p className="text-gray-600">All items are properly stocked.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const priority = getAlertPriority(item)
            const config = getAlertConfig(priority)

            return (
              <div key={item.id} className={`bg-white border rounded-lg p-4 ${config.border}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Alert Icon */}
                    <div className={`p-3 rounded-lg ${config.bg}`}>
                      <span className="text-xl">{config.icon}</span>
                    </div>

                    {/* Item Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{item.productName}</h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.badge}`}>
                          {priority.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">
                            <span className="font-medium">SKU:</span> {item.sku}
                          </p>
                          <p className="text-gray-600 mb-1">
                            <span className="font-medium">Current Stock:</span>
                            <span className={`ml-1 font-semibold ${item.currentStock === 0 ? 'text-red-600' : config.color}`}>
                              {item.currentStock} units
                            </span>
                          </p>
                          <p className="text-gray-600 mb-1">
                            <span className="font-medium">Reorder Level:</span> {item.reorderLevel} units
                          </p>
                          {item.attributes && (
                            <div className="flex gap-2 mt-2">
                              {item.attributes.size && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                  Size: {item.attributes.size}
                                </span>
                              )}
                              {item.attributes.color && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                  {item.attributes.color}
                                </span>
                              )}
                              {item.attributes.condition && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                                  {item.attributes.condition}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          {item.supplier && (
                            <p className="text-gray-600 mb-1">
                              <span className="font-medium">Supplier:</span> {item.supplier.name}
                            </p>
                          )}
                          {item.unitCost && (
                            <p className="text-gray-600 mb-1">
                              <span className="font-medium">Unit Cost:</span> {formatCurrency(item.unitCost)}
                            </p>
                          )}
                          {item.lastRestocked && (
                            <p className="text-gray-600 mb-1">
                              <span className="font-medium">Last Restocked:</span> {formatDate(new Date(item.lastRestocked))}
                            </p>
                          )}
                          {item.daysUntilOutOfStock !== undefined && item.daysUntilOutOfStock > 0 && (
                            <p className="text-gray-600 mb-1">
                              <span className="font-medium">Est. Out of Stock:</span>
                              <span className={`ml-1 ${item.daysUntilOutOfStock <= 7 ? 'text-red-600 font-semibold' : ''}`}>
                                {item.daysUntilOutOfStock} days
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    {item.reorderQuantity && (
                      <button
                        onClick={() => handleCreatePurchaseOrder(item)}
                        className="px-3 py-1 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Order {item.reorderQuantity}
                      </button>
                    )}
                    {item.supplier?.contactInfo && (
                      <button
                        onClick={() => handleContactSupplier(item.supplier!)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Contact Supplier
                      </button>
                    )}
                  </div>
                </div>

                {/* Projected Cost */}
                {item.reorderQuantity && item.unitCost && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        Suggested Reorder: {item.reorderQuantity} units
                      </span>
                      <span className="font-semibold text-gray-900">
                        Total Cost: {formatCurrency(item.reorderQuantity * item.unitCost)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Summary */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Action Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-red-600 font-semibold">
              {filteredItems.filter(i => getAlertPriority(i) === 'critical').length} Critical Items
            </div>
            <div className="text-red-700 text-xs mt-1">Immediate action required</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-orange-600 font-semibold">
              {filteredItems.filter(i => getAlertPriority(i) === 'warning').length} Warning Items
            </div>
            <div className="text-orange-700 text-xs mt-1">Plan restocking soon</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-600 font-semibold">
              {filteredItems.filter(i => i.reorderQuantity && i.unitCost).reduce((sum, item) => sum + (item.reorderQuantity! * item.unitCost!), 0) > 0
                ? formatCurrency(filteredItems.filter(i => i.reorderQuantity && i.unitCost).reduce((sum, item) => sum + (item.reorderQuantity! * item.unitCost!), 0))
                : 'N/A'
              }
            </div>
            <div className="text-blue-700 text-xs mt-1">Estimated reorder cost</div>
          </div>
        </div>
      </div>
    </div>
  )
}