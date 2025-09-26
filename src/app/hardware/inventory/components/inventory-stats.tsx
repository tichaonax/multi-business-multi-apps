'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface HardwareInventoryStats {
  totalProducts: number
  totalStockValue: number
  toolsCount: number
  materialsCount: number
  lowStockItems: number
  outOfStockItems: number
  rentalItems: number
  specialOrders: number
  categoryBreakdown: Array<{
    categoryName: string
    productCount: number
    stockValue: number
    avgTurnover: number
  }>
  supplierBreakdown: Array<{
    supplierName: string
    productCount: number
    stockValue: number
    leadTime: number
  }>
  contractorSales: {
    thisMonth: number
    lastMonth: number
    avgOrderValue: number
  }
}

interface HardwareInventoryStatsProps {
  businessId: string
}

export function HardwareInventoryStats({ businessId }: HardwareInventoryStatsProps) {
  const { formatCurrency } = useBusinessContext()
  const [stats, setStats] = useState<HardwareInventoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        // Sample hardware inventory stats
        const sampleStats: HardwareInventoryStats = {
          totalProducts: 1847,
          totalStockValue: 284567.89,
          toolsCount: 567,
          materialsCount: 1280,
          lowStockItems: 43,
          outOfStockItems: 12,
          rentalItems: 89,
          specialOrders: 17,
          categoryBreakdown: [
            {
              categoryName: 'Tools & Equipment',
              productCount: 567,
              stockValue: 125600.00,
              avgTurnover: 4.2
            },
            {
              categoryName: 'Electrical',
              productCount: 234,
              stockValue: 45600.00,
              avgTurnover: 6.1
            },
            {
              categoryName: 'Plumbing',
              productCount: 189,
              stockValue: 34200.00,
              avgTurnover: 5.8
            },
            {
              categoryName: 'Lumber & Building Materials',
              productCount: 156,
              stockValue: 89400.00,
              avgTurnover: 8.3
            },
            {
              categoryName: 'Fasteners & Hardware',
              productCount: 445,
              stockValue: 18900.00,
              avgTurnover: 12.4
            },
            {
              categoryName: 'Paint & Supplies',
              productCount: 123,
              stockValue: 23400.00,
              avgTurnover: 7.2
            }
          ],
          supplierBreakdown: [
            {
              supplierName: 'Milwaukee Tool',
              productCount: 89,
              stockValue: 45600.00,
              leadTime: 3
            },
            {
              supplierName: 'Home Depot Supply',
              productCount: 234,
              stockValue: 67800.00,
              leadTime: 1
            },
            {
              supplierName: 'ABC Lumber',
              productCount: 67,
              stockValue: 34500.00,
              leadTime: 2
            },
            {
              supplierName: 'Electrical Wholesalers',
              productCount: 156,
              stockValue: 28900.00,
              leadTime: 4
            }
          ],
          contractorSales: {
            thisMonth: 145600.00,
            lastMonth: 134200.00,
            avgOrderValue: 387.50
          }
        }

        setStats(sampleStats)

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        console.error('Failed to fetch hardware inventory stats:', err)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchStats()
    }
  }, [businessId])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Failed to load inventory stats: {error}</p>
      </div>
    )
  }

  if (!stats) return null

  const mainStatCards = [
    {
      title: 'Total Inventory Value',
      value: formatCurrency(stats.totalStockValue),
      subtitle: `${stats.totalProducts} products`,
      icon: '💰',
      color: 'text-green-600',
      trend: '+8.5%'
    },
    {
      title: 'Tools & Equipment',
      value: stats.toolsCount.toString(),
      subtitle: formatCurrency(125600),
      icon: '🔧',
      color: 'text-blue-600',
      trend: '+2.1%'
    },
    {
      title: 'Building Materials',
      value: stats.materialsCount.toString(),
      subtitle: formatCurrency(158967.89),
      icon: '🏗️',
      color: 'text-orange-600',
      trend: '+12.3%'
    },
    {
      title: 'Rental Equipment',
      value: stats.rentalItems.toString(),
      subtitle: '85% utilization',
      icon: '🚛',
      color: 'text-purple-600',
      trend: '+5.7%'
    }
  ]

  const alertCards = [
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems.toString(),
      subtitle: 'Need reordering',
      icon: '⚠️',
      color: 'text-orange-600'
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStockItems.toString(),
      subtitle: 'Immediate attention',
      icon: '🚫',
      color: 'text-red-600'
    },
    {
      title: 'Special Orders',
      value: stats.specialOrders.toString(),
      subtitle: 'In progress',
      icon: '📋',
      color: 'text-blue-600'
    },
    {
      title: 'Contractor Sales',
      value: formatCurrency(stats.contractorSales.thisMonth),
      subtitle: `${((stats.contractorSales.thisMonth - stats.contractorSales.lastMonth) / stats.contractorSales.lastMonth * 100).toFixed(1)}% vs last month`,
      icon: '👷',
      color: 'text-green-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStatCards.map((card) => (
          <div key={card.title} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              </div>
              <div className="text-3xl opacity-20">{card.icon}</div>
            </div>
            {card.trend && (
              <div className="mt-2">
                <span className="text-xs font-medium text-green-600">{card.trend}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Alert Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {alertCards.map((card) => (
          <div key={card.title} className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{card.icon}</div>
              <div>
                <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
                <div className="text-xs text-gray-600">{card.title}</div>
                <div className="text-xs text-gray-500">{card.subtitle}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
          <div className="space-y-3">
            {stats.categoryBreakdown.map((category) => (
              <div key={category.categoryName} className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">{category.categoryName}</span>
                    <span className="text-sm text-gray-500">{category.productCount} items</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-600">{formatCurrency(category.stockValue)}</span>
                    <span className="text-xs text-green-600">
                      {category.avgTurnover}x turnover/year
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supplier Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Suppliers</h3>
          <div className="space-y-3">
            {stats.supplierBreakdown.map((supplier) => (
              <div key={supplier.supplierName} className="flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">{supplier.supplierName}</span>
                    <span className="text-sm text-gray-500">{supplier.productCount} items</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-600">{formatCurrency(supplier.stockValue)}</span>
                    <span className="text-xs text-blue-600">
                      {supplier.leadTime} day{supplier.leadTime !== 1 ? 's' : ''} lead time
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hardware-specific Metrics */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hardware Store Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">🔨</div>
            <div className="text-2xl font-bold text-blue-600">4.8x</div>
            <div className="text-sm text-gray-600">Average Tool Turnover</div>
            <div className="text-xs text-gray-500 mt-1">Per year</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🚛</div>
            <div className="text-2xl font-bold text-green-600">85%</div>
            <div className="text-sm text-gray-600">Rental Utilization</div>
            <div className="text-xs text-gray-500 mt-1">Current month</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">👷</div>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.contractorSales.avgOrderValue)}</div>
            <div className="text-sm text-gray-600">Avg Contractor Order</div>
            <div className="text-xs text-gray-500 mt-1">Much higher than retail</div>
          </div>
        </div>
      </div>
    </div>
  )
}