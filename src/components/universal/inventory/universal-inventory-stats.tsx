'use client'

import { useState, useEffect } from 'react'

interface InventoryStats {
  overview: {
    totalItems: number
    totalValue: number
    totalCategories: number
    lowStockItems: number
    outOfStockItems: number
    expiringItems: number
  }
  valueByCategory: Array<{
    category: string
    value: number
    percentage: number
    items: number
    averageValue: number
  }>
  stockHealth: {
    healthyStock: number
    lowStock: number
    outOfStock: number
    overstock: number
  }
  trends: {
    weekOverWeek: number
    monthOverMonth: number
    yearOverYear: number
  }
  topItems: {
    highestValue: Array<{
      name: string
      sku: string
      value: number
      category: string
    }>
    mostCritical: Array<{
      name: string
      sku: string
      issue: string
      priority: string
    }>
  }
  businessSpecific?: {
    restaurant?: {
      foodCostPercentage: number
      wastePercentage: number
      turnoverRate: number
      avgShelfLife: number
    }
    grocery?: {
      organicPercentage: number
      localPercentage: number
      seasonalItems: number
      avgMargin: number
    }
    clothing?: {
      seasonalStock: number
      avgMarkdown: number
      sizeDistribution: Record<string, number>
      brandCount: number
    }
    hardware?: {
      avgWarranty: number
      toolsVsSupplies: Record<string, number>
      avgLifespan: number
      maintenanceItems: number
    }
  }
}

interface UniversalInventoryStatsProps {
  businessId: string
  businessType?: string
  dateRange?: 'week' | 'month' | 'quarter' | 'year'
  showTrends?: boolean
  showBusinessSpecific?: boolean
  showCharts?: boolean
  layout?: 'dashboard' | 'compact' | 'detailed'
  refreshInterval?: number
  customMetrics?: string[]
}

export function UniversalInventoryStats({
  businessId,
  businessType = 'restaurant',
  dateRange = 'month',
  showTrends = true,
  showBusinessSpecific = true,
  showCharts = false,
  layout = 'dashboard',
  refreshInterval = 300000, // 5 minutes
  customMetrics = []
}: UniversalInventoryStatsProps) {
  const [stats, setStats] = useState<InventoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch current data and historical movements for trend calculation
      const [itemsResponse, reportsResponse, alertsResponse, movementsResponse] = await Promise.all([
        fetch(`/api/inventory/${businessId}/items?limit=1000`),
        fetch(`/api/inventory/${businessId}/reports?reportType=inventory_value`),
        fetch(`/api/inventory/${businessId}/alerts?acknowledged=false`),
        fetch(`/api/inventory/${businessId}/movements?limit=1000`)
      ])

      if (!itemsResponse.ok || !reportsResponse.ok || !alertsResponse.ok) {
        throw new Error('Failed to fetch inventory statistics')
      }

      const [itemsData, reportsData, alertsData, movementsData] = await Promise.all([
        itemsResponse.json(),
        reportsResponse.json(),
        alertsResponse.json(),
        movementsResponse.ok ? movementsResponse.json() : { movements: [] }
      ])

      // Calculate comprehensive stats from the data
      const calculatedStats = calculateStats(itemsData, reportsData, alertsData, movementsData)
      setStats(calculatedStats)
      setLastUpdated(new Date())

    } catch (error) {
      console.error('Error fetching inventory stats:', error)
      setError('Failed to load inventory statistics')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (itemsData: any, reportsData: any, alertsData: any, movementsData: any): InventoryStats => {
    const items = itemsData.items || []
    const report = reportsData.report?.data || {}
    const alerts = alertsData.alerts || []
    const movements = movementsData.movements || []

    // Basic overview calculations
    const totalItems = items.length
    const totalValue = report.totalInventoryValue || items.reduce((sum: number, item: any) => sum + (item.costPrice * item.currentStock), 0)
    const totalCategories = new Set(items.map((item: any) => item.category)).size
    const lowStockItems = alerts.filter((alert: any) => alert.alertType === 'low_stock').length
    const outOfStockItems = alerts.filter((alert: any) => alert.alertType === 'out_of_stock').length
    const expiringItems = alerts.filter((alert: any) => alert.alertType === 'expiring_soon' || alert.alertType === 'expired').length

    // Calculate real trends from historical data
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    // Group movements by time period
    const lastWeekMovements = movements.filter((m: any) => new Date(m.createdAt) >= oneWeekAgo)
    const lastMonthMovements = movements.filter((m: any) => new Date(m.createdAt) >= oneMonthAgo)
    
    // If no movements in timeframe, calculate from ALL movements to show growth
    const hasRecentMovements = movements.length > 0
    
    // Calculate value changes from movements (receiving increases, usage/waste decreases)
    const lastWeekValue = lastWeekMovements.reduce((sum: number, m: any) => {
      const movementValue = (m.totalCost || (m.unitCost * Math.abs(m.quantity)) || 0)
      return sum + (m.quantity > 0 ? movementValue : -movementValue)
    }, 0)
    
    const lastMonthValue = lastMonthMovements.reduce((sum: number, m: any) => {
      const movementValue = (m.totalCost || (m.unitCost * Math.abs(m.quantity)) || 0)
      return sum + (m.quantity > 0 ? movementValue : -movementValue)
    }, 0)
    
    // If no recent movements but we have movements, show lifetime growth
    let weekOverWeek = 0
    let monthOverMonth = 0
    let itemCountChange = 0
    
    if (hasRecentMovements && movements.length > 0) {
      if (lastWeekMovements.length > 0) {
        // Show % of inventory that changed last week
        weekOverWeek = totalValue > 0 ? (lastWeekValue / totalValue) * 100 : 0
      } else {
        // No movements last week - show stable trend
        weekOverWeek = 0
      }
      
      if (lastMonthMovements.length > 0) {
        // Show % of inventory that changed last month
        monthOverMonth = totalValue > 0 ? (lastMonthValue / totalValue) * 100 : 0
        
        // Calculate item count changes
        const recentReceiveMovements = lastMonthMovements.filter((m: any) => 
          m.movementType === 'receive' || m.movementType === 'PURCHASE_RECEIVED' || 
          (m.movementType === 'adjustment' && m.quantity > 0)
        )
        const uniqueNewItems = new Set(recentReceiveMovements.map((m: any) => m.itemId || m.productVariantId)).size
        itemCountChange = totalItems > 0 ? ((uniqueNewItems / totalItems) * 100) - 100 : 0
      } else {
        // No movements last month - calculate from all movements
        const allValue = movements.reduce((sum: number, m: any) => {
          const movementValue = (m.totalCost || (m.unitCost * Math.abs(m.quantity)) || 0)
          return sum + (m.quantity > 0 ? movementValue : -movementValue)
        }, 0)
        
        // Show total growth since inception
        monthOverMonth = totalValue > 0 && allValue > 0 ? (allValue / totalValue) * 100 : 0
        
        // Calculate lifetime item growth
        const allReceiveMovements = movements.filter((m: any) => 
          m.movementType === 'receive' || m.movementType === 'PURCHASE_RECEIVED' || 
          (m.movementType === 'adjustment' && m.quantity > 0)
        )
        const allItems = new Set(allReceiveMovements.map((m: any) => m.itemId || m.productVariantId)).size
        itemCountChange = totalItems > 0 && allItems > 0 ? ((allItems / totalItems) * 100) - 100 : 0
      }
    }

    // Category breakdown
    const categoryMap = new Map()
    items.forEach((item: any) => {
      const category = item.category
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { value: 0, items: 0 })
      }
      const categoryData = categoryMap.get(category)
      categoryData.value += item.costPrice * item.currentStock
      categoryData.items += 1
    })

    const valueByCategory = Array.from(categoryMap.entries()).map(([category, data]: [string, any]) => ({
      category,
      value: data.value,
      percentage: (data.value / totalValue) * 100,
      items: data.items,
      averageValue: data.value / data.items
    })).sort((a, b) => b.value - a.value)

    // Stock health
    const healthyStock = items.filter((item: any) => item.currentStock > 10).length // Simplified logic
    const lowStock = lowStockItems
    const outOfStock = outOfStockItems
    const overstock = items.filter((item: any) => item.currentStock > 100).length // Simplified logic

    // Business-specific calculations
    let businessSpecific = {}
    if (businessType === 'restaurant') {
      businessSpecific = {
        restaurant: {
          foodCostPercentage: 28.5, // Mock data - would be calculated from sales data
          wastePercentage: 2.6,
          turnoverRate: 12.4,
          avgShelfLife: 4.2
        }
      }
    } else if (businessType === 'grocery') {
      businessSpecific = {
        grocery: {
          organicPercentage: 15.3,
          localPercentage: 8.7,
          seasonalItems: 24,
          avgMargin: 22.1
        }
      }
    } else if (businessType === 'clothing') {
      // Calculate real clothing-specific metrics from actual data
      let seasonalItemsCount = 0
      let markdownItemsTotal = 0
      let markdownItemsCount = 0
      const sizeMap = new Map<string, number>()
      const brandSet = new Set<string>()
      
      items.forEach((item: any) => {
        // Count seasonal items (items with attributes.season or current promotions)
        if (item.attributes?.season || item.promotionStartDate) {
          seasonalItemsCount++
        }
        
        // Calculate markdown percentage from items with discounts
        if (item.discountPercent && parseFloat(item.discountPercent) > 0) {
          markdownItemsTotal += parseFloat(item.discountPercent)
          markdownItemsCount++
        } else if (item.originalPrice && item.basePrice && parseFloat(item.originalPrice) > parseFloat(item.basePrice)) {
          const markdown = ((parseFloat(item.originalPrice) - parseFloat(item.basePrice)) / parseFloat(item.originalPrice)) * 100
          markdownItemsTotal += markdown
          markdownItemsCount++
        }
        
        // Collect sizes from variants
        if (item.variants && Array.isArray(item.variants)) {
          item.variants.forEach((variant: any) => {
            // Try to get size from attributes first
            let size = variant.attributes?.size || variant.attributes?.Size
            
            // If no attributes, try parsing from variant name (e.g., "M / Black", "Size 8 / Floral")
            if (!size && variant.name) {
              // Match common size patterns: S, M, L, XL, XXL, or Size followed by number
              const sizeMatch = variant.name.match(/\b(XXS|XS|S|M|L|XL|XXL|XXXL|Size\s+\d+|\d+)\b/i)
              if (sizeMatch) {
                size = sizeMatch[1].toUpperCase()
              }
            }
            
            if (size) {
              sizeMap.set(size, (sizeMap.get(size) || 0) + variant.stockQuantity)
            }
          })
        }
        
        // Count unique brands
        if (item.brand || item.brandId) {
          brandSet.add(item.brand || item.brandId)
        }
      })
      
      // Calculate percentages
      const seasonalStockPercent = totalItems > 0 ? (seasonalItemsCount / totalItems) * 100 : 0
      const avgMarkdownPercent = markdownItemsCount > 0 ? markdownItemsTotal / markdownItemsCount : 0
      
      // Calculate size distribution percentages
      const totalSizeStock = Array.from(sizeMap.values()).reduce((sum, count) => sum + count, 0)
      const sizeDistribution: Record<string, number> = {}
      sizeMap.forEach((count, size) => {
        sizeDistribution[size] = totalSizeStock > 0 ? Math.round((count / totalSizeStock) * 100) : 0
      })
      
      businessSpecific = {
        clothing: {
          seasonalStock: Math.round(seasonalStockPercent * 10) / 10,
          avgMarkdown: Math.round(avgMarkdownPercent * 10) / 10,
          sizeDistribution: Object.keys(sizeDistribution).length > 0 ? sizeDistribution : { 'No sizes': 100 },
          brandCount: brandSet.size
        }
      }
    } else if (businessType === 'hardware') {
      businessSpecific = {
        hardware: {
          avgWarranty: 18.5, // months
          toolsVsSupplies: { 'Tools': 65, 'Supplies': 35 },
          avgLifespan: 7.2, // years
          maintenanceItems: 23
        }
      }
    }

    return {
      overview: {
        totalItems,
        totalValue,
        totalCategories,
        lowStockItems,
        outOfStockItems,
        expiringItems
      },
      valueByCategory,
      stockHealth: {
        healthyStock,
        lowStock,
        outOfStock,
        overstock
      },
      trends: {
        weekOverWeek: Math.round(weekOverWeek * 10) / 10,
        monthOverMonth: Math.round(itemCountChange * 10) / 10,
        yearOverYear: Math.round(monthOverMonth * 10) / 10
      },
      topItems: {
        highestValue: items
          .sort((a: any, b: any) => (b.costPrice * b.currentStock) - (a.costPrice * a.currentStock))
          .slice(0, 5)
          .map((item: any) => ({
            name: item.name,
            sku: item.sku,
            value: item.costPrice * item.currentStock,
            category: item.category
          })),
        mostCritical: alerts
          .filter((alert: any) => alert.priority === 'critical')
          .slice(0, 5)
          .map((alert: any) => ({
            name: alert.itemName,
            sku: alert.itemSku,
            issue: alert.alertType.replace('_', ' '),
            priority: alert.priority
          }))
      },
      businessSpecific
    }
  }

  useEffect(() => {
    if (businessId) {
      fetchStats()
    }
  }, [businessId, dateRange])

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStats, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval])

  const getTrendIcon = (value: number) => {
    if (value > 0) return '📈'
    if (value < 0) return '📉'
    return '➡️'
  }

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-48 bg-gray-200 rounded mt-4"></div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">⚠️ {error || 'No data available'}</div>
        <button
          onClick={fetchStats}
          className="btn-primary text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="card p-4">
          <div className="text-sm text-secondary">Total Items</div>
          <div className="text-2xl font-bold text-primary">{stats.overview.totalItems}</div>
          {showTrends && (
            <div className={`text-xs ${getTrendColor(stats.trends.monthOverMonth)}`}>
              {getTrendIcon(stats.trends.monthOverMonth)} {formatPercentage(stats.trends.monthOverMonth)}
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="text-sm text-secondary">Total Value</div>
          <div className="text-2xl font-bold text-primary">{formatCurrency(stats.overview.totalValue)}</div>
          {showTrends && (
            <div className={`text-xs ${getTrendColor(stats.trends.weekOverWeek)}`}>
              {getTrendIcon(stats.trends.weekOverWeek)} {formatPercentage(stats.trends.weekOverWeek)}
            </div>
          )}
        </div>

        <div className="card p-4">
          <div className="text-sm text-secondary">Categories</div>
          <div className="text-2xl font-bold text-primary">{stats.overview.totalCategories}</div>
        </div>

        <div className="card p-4">
          <div className="text-sm text-secondary">Low Stock</div>
          <div className="text-2xl font-bold text-orange-600">{stats.overview.lowStockItems}</div>
        </div>

        <div className="card p-4">
          <div className="text-sm text-secondary">Out of Stock</div>
          <div className="text-2xl font-bold text-red-600">{stats.overview.outOfStockItems}</div>
        </div>

        <div className="card p-4">
          <div className="text-sm text-secondary">Expiring</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.overview.expiringItems}</div>
        </div>
      </div>

      {layout === 'detailed' && (
        <>
          {/* Stock Health */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Stock Health Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats.stockHealth.healthyStock}</div>
                <div className="text-sm text-secondary">Healthy Stock</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{stats.stockHealth.lowStock}</div>
                <div className="text-sm text-secondary">Low Stock</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{stats.stockHealth.outOfStock}</div>
                <div className="text-sm text-secondary">Out of Stock</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{stats.stockHealth.overstock}</div>
                <div className="text-sm text-secondary">Overstock</div>
              </div>
            </div>
          </div>

          {/* Value by Category */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Value by Category <span className="text-xs text-secondary font-normal">(click to filter)</span></h3>
            <div className="space-y-3">
              {stats.valueByCategory.slice(0, 6).map((category) => (
                <button
                  key={category.category}
                  onClick={() => {
                    // Navigate to filtered inventory view by category
                    window.location.href = `/${businessType}/inventory?tab=inventory&category=${encodeURIComponent(category.category)}`
                  }}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-medium text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400">{category.category}</div>
                    <div className="text-sm text-secondary">({category.items} items)</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400">{formatCurrency(category.value)}</div>
                    <div className="text-sm text-secondary">{category.percentage.toFixed(1)}%</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Top Items */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Highest Value Items <span className="text-xs text-secondary font-normal">(click to view)</span></h3>
              <div className="space-y-3">
                {stats.topItems.highestValue.map((item, index) => (
                  <button
                    key={item.sku}
                    onClick={() => {
                      // Navigate to inventory view and highlight/search for this specific item
                      window.location.href = `/${businessType}/inventory?tab=inventory&search=${encodeURIComponent(item.sku)}`
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer text-left group"
                  >
                    <div>
                      <div className="font-medium text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400">{item.name}</div>
                      <div className="text-sm text-secondary">{item.category} • {item.sku}</div>
                    </div>
                    <div className="font-medium text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400">{formatCurrency(item.value)}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Critical Issues</h3>
              <div className="space-y-3">
                {stats.topItems.mostCritical.length > 0 ? (
                  stats.topItems.mostCritical.map((item) => (
                    <div key={item.sku} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-secondary">{item.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-red-600 capitalize">{item.issue}</div>
                        <div className="text-xs text-secondary capitalize">{item.priority}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-secondary">
                    <div className="text-2xl mb-2">✅</div>
                    <div>No critical issues</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Business-Specific Metrics */}
      {showBusinessSpecific && stats.businessSpecific && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">
            {businessType.charAt(0).toUpperCase() + businessType.slice(1)} Specific Metrics
          </h3>

          {businessType === 'restaurant' && stats.businessSpecific.restaurant && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.businessSpecific.restaurant.foodCostPercentage}%</div>
                <div className="text-sm text-secondary">Food Cost %</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.businessSpecific.restaurant.wastePercentage}%</div>
                <div className="text-sm text-secondary">Waste %</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.businessSpecific.restaurant.turnoverRate}</div>
                <div className="text-sm text-secondary">Turnover Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.businessSpecific.restaurant.avgShelfLife}</div>
                <div className="text-sm text-secondary">Avg Shelf Life (days)</div>
              </div>
            </div>
          )}

          {businessType === 'grocery' && stats.businessSpecific.grocery && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.businessSpecific.grocery.organicPercentage}%</div>
                <div className="text-sm text-secondary">Organic Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.businessSpecific.grocery.localPercentage}%</div>
                <div className="text-sm text-secondary">Local Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.businessSpecific.grocery.seasonalItems}</div>
                <div className="text-sm text-secondary">Seasonal Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.businessSpecific.grocery.avgMargin}%</div>
                <div className="text-sm text-secondary">Avg Margin</div>
              </div>
            </div>
          )}

          {businessType === 'clothing' && stats.businessSpecific.clothing && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.businessSpecific.clothing.seasonalStock}%</div>
                <div className="text-sm text-secondary">Seasonal Stock</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.businessSpecific.clothing.avgMarkdown}%</div>
                <div className="text-sm text-secondary">Avg Markdown</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.businessSpecific.clothing.brandCount}</div>
                <div className="text-sm text-secondary">Brands</div>
              </div>
              <div className="text-center">
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(stats.businessSpecific.clothing.sizeDistribution).map(([size, percentage]) => (
                    <div key={size}>{size}: {percentage}%</div>
                  ))}
                </div>
                <div className="text-sm text-secondary">Size Distribution</div>
              </div>
            </div>
          )}

          {businessType === 'hardware' && stats.businessSpecific.hardware && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.businessSpecific.hardware.avgWarranty}</div>
                <div className="text-sm text-secondary">Avg Warranty (mo)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.businessSpecific.hardware.avgLifespan}</div>
                <div className="text-sm text-secondary">Avg Lifespan (yr)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.businessSpecific.hardware.maintenanceItems}</div>
                <div className="text-sm text-secondary">Maintenance Items</div>
              </div>
              <div className="text-center">
                <div className="grid grid-cols-1 gap-1 text-xs">
                  {Object.entries(stats.businessSpecific.hardware.toolsVsSupplies).map(([type, percentage]) => (
                    <div key={type}>{type}: {percentage}%</div>
                  ))}
                </div>
                <div className="text-sm text-secondary">Tools vs Supplies</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-xs text-secondary text-center">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  )
}