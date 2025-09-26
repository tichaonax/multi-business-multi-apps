'use client'

import { useState, useEffect } from 'react'
import { useBusinessContext } from '@/components/universal'

interface InventoryStats {
  totalProducts: number
  totalVariants: number
  totalStockValue: number
  lowStockItems: number
  outOfStockItems: number
  categoryBreakdown: Array<{
    categoryName: string
    productCount: number
    stockValue: number
  }>
  conditionBreakdown: Array<{
    condition: string
    count: number
    value: number
  }>
  sizeBreakdown: Array<{
    size: string
    count: number
  }>
  recentMovements: number
}

interface ClothingInventoryStatsProps {
  businessId: string
}

export function ClothingInventoryStats({ businessId }: ClothingInventoryStatsProps) {
  const { formatCurrency } = useBusinessContext()
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch products with variants and calculate stats
        const response = await fetch(`/api/universal/products?businessId=${businessId}&includeVariants=true&limit=1000`)
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch inventory data')
        }

        const products = data.data

        // Calculate comprehensive stats
        let totalProducts = products.length
        let totalVariants = 0
        let totalStockValue = 0
        let lowStockItems = 0
        let outOfStockItems = 0

        const categoryMap = new Map<string, { productCount: number; stockValue: number }>()
        const conditionMap = new Map<string, { count: number; value: number }>()
        const sizeMap = new Map<string, number>()

        products.forEach((product: any) => {
          // Category breakdown
          const categoryName = product.category?.name || 'Uncategorized'
          const categoryStats = categoryMap.get(categoryName) || { productCount: 0, stockValue: 0 }
          categoryStats.productCount += 1

          // Condition breakdown
          const conditionStats = conditionMap.get(product.condition) || { count: 0, value: 0 }
          conditionStats.count += 1

          if (product.variants && product.variants.length > 0) {
            totalVariants += product.variants.length

            product.variants.forEach((variant: any) => {
              const variantValue = (variant.price || product.basePrice) * variant.stockQuantity
              totalStockValue += variantValue
              categoryStats.stockValue += variantValue
              conditionStats.value += variantValue

              // Stock level checks
              if (variant.stockQuantity === 0) {
                outOfStockItems += 1
              } else if (variant.stockQuantity <= 10) { // Configurable threshold
                lowStockItems += 1
              }

              // Size breakdown from variant attributes
              if (variant.attributes?.size) {
                const size = variant.attributes.size
                sizeMap.set(size, (sizeMap.get(size) || 0) + variant.stockQuantity)
              }
            })
          } else {
            totalVariants += 1
            const productValue = product.basePrice * 1 // Assume 1 item if no variants
            totalStockValue += productValue
            categoryStats.stockValue += productValue
            conditionStats.value += productValue
          }

          categoryMap.set(categoryName, categoryStats)
          conditionMap.set(product.condition, conditionStats)
        })

        // Convert maps to arrays for rendering
        const categoryBreakdown = Array.from(categoryMap.entries()).map(([categoryName, stats]) => ({
          categoryName,
          productCount: stats.productCount,
          stockValue: stats.stockValue
        }))

        const conditionBreakdown = Array.from(conditionMap.entries()).map(([condition, stats]) => ({
          condition,
          count: stats.count,
          value: stats.value
        }))

        const sizeBreakdown = Array.from(sizeMap.entries()).map(([size, count]) => ({
          size,
          count
        })).sort((a, b) => {
          // Custom size sorting
          const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL']
          const aIndex = sizeOrder.indexOf(a.size)
          const bIndex = sizeOrder.indexOf(b.size)
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
          return a.size.localeCompare(b.size)
        })

        setStats({
          totalProducts,
          totalVariants,
          totalStockValue,
          lowStockItems,
          outOfStockItems,
          categoryBreakdown,
          conditionBreakdown,
          sizeBreakdown,
          recentMovements: 0 // Would be fetched from stock movements API
        })

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        console.error('Failed to fetch inventory stats:', err)
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
        {[...Array(4)].map((_, i) => (
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

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts.toLocaleString(),
      subtitle: `${stats.totalVariants} variants`,
      icon: '👕',
      color: 'text-blue-600'
    },
    {
      title: 'Stock Value',
      value: formatCurrency(stats.totalStockValue),
      subtitle: 'Total inventory worth',
      icon: '💰',
      color: 'text-green-600'
    },
    {
      title: 'Low Stock',
      value: stats.lowStockItems.toString(),
      subtitle: 'Items need restocking',
      icon: '⚠️',
      color: 'text-orange-600'
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStockItems.toString(),
      subtitle: 'Items unavailable',
      icon: '🚫',
      color: 'text-red-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div key={card.title} className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              </div>
              <div className="text-3xl opacity-20">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Category</h3>
          <div className="space-y-3">
            {stats.categoryBreakdown.slice(0, 5).map((category) => (
              <div key={category.categoryName} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{category.categoryName}</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{category.productCount} items</div>
                  <div className="text-xs text-gray-500">{formatCurrency(category.stockValue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Condition Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Condition</h3>
          <div className="space-y-3">
            {stats.conditionBreakdown.map((condition) => (
              <div key={condition.condition} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">
                  {condition.condition.toLowerCase()}
                </span>
                <div className="text-right">
                  <div className="text-sm font-medium">{condition.count} items</div>
                  <div className="text-xs text-gray-500">{formatCurrency(condition.value)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Size Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Size</h3>
          <div className="space-y-3">
            {stats.sizeBreakdown.slice(0, 6).map((size) => (
              <div key={size.size} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{size.size}</span>
                <span className="text-sm font-medium">{size.count} units</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}