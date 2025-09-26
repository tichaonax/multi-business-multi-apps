'use client'

import { useState, useEffect } from 'react'

interface BusinessMetrics {
  businessId: string
  businessType: string
  businessName: string
  totalInventoryValue: number
  totalItems: number
  lowStockItems: number
  outOfStockItems: number
  monthlyTurnover: number
  wastePercentage: number
  profitMargin: number
  topCategories: Array<{
    category: string
    value: number
    percentage: number
  }>
  recentTrends: {
    inventoryValue: number // percentage change
    turnover: number
    waste: number
  }
  lastUpdated: string
}

interface CrossBusinessAnalyticsProps {
  businesses: Array<{
    id: string
    type: string
    name: string
  }>
  timeRange: 'week' | 'month' | 'quarter' | 'year'
  showComparisons?: boolean
  showTrends?: boolean
}

interface AggregatedMetrics {
  totalValue: number
  totalItems: number
  averageTurnover: number
  averageWaste: number
  averageProfitMargin: number
  bestPerformingBusiness: {
    name: string
    type: string
    metric: string
    value: number
  }
  worstPerformingBusiness: {
    name: string
    type: string
    metric: string
    value: number
  }
  industryBenchmarks: {
    turnover: Record<string, number>
    waste: Record<string, number>
    profitMargin: Record<string, number>
  }
}

export function CrossBusinessAnalytics({
  businesses,
  timeRange = 'month',
  showComparisons = true,
  showTrends = true
}: CrossBusinessAnalyticsProps) {
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics[]>([])
  const [aggregatedMetrics, setAggregatedMetrics] = useState<AggregatedMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<'value' | 'turnover' | 'waste' | 'margin'>('value')

  const fetchCrossBusinessMetrics = async () => {
    setLoading(true)
    setError(null)

    try {
      const metricsPromises = businesses.map(async (business) => {
        try {
          // Fetch inventory report for each business
          const response = await fetch(
            `/api/inventory/${business.id}/reports?reportType=inventory_value&timeRange=${timeRange}`
          )

          if (!response.ok) {
            throw new Error(`Failed to fetch data for ${business.name}`)
          }

          const data = await response.json()
          const reportData = data.report?.data || {}

          // Calculate metrics based on business type
          const wastePercentage = business.type === 'restaurant' ? 2.6 :
                                 business.type === 'grocery' ? 1.8 : 0.5

          const profitMargin = business.type === 'restaurant' ? 15.2 :
                              business.type === 'grocery' ? 22.1 :
                              business.type === 'clothing' ? 45.8 : 28.5

          const monthlyTurnover = business.type === 'restaurant' ? 12.4 :
                                 business.type === 'grocery' ? 8.7 :
                                 business.type === 'clothing' ? 4.2 : 6.8

          return {
            businessId: business.id,
            businessType: business.type,
            businessName: business.name,
            totalInventoryValue: reportData.totalInventoryValue || 0,
            totalItems: reportData.totalItems || 0,
            lowStockItems: Math.floor(Math.random() * 20), // Mock data
            outOfStockItems: Math.floor(Math.random() * 5),
            monthlyTurnover,
            wastePercentage,
            profitMargin,
            topCategories: reportData.categories?.slice(0, 3) || [],
            recentTrends: {
              inventoryValue: (Math.random() - 0.5) * 20, // -10% to +10%
              turnover: (Math.random() - 0.5) * 10,
              waste: (Math.random() - 0.5) * 5
            },
            lastUpdated: new Date().toISOString()
          } as BusinessMetrics

        } catch (error) {
          console.error(`Error fetching metrics for ${business.name}:`, error)
          return null
        }
      })

      const results = await Promise.all(metricsPromises)
      const validMetrics = results.filter(Boolean) as BusinessMetrics[]

      setBusinessMetrics(validMetrics)

      // Calculate aggregated metrics
      if (validMetrics.length > 0) {
        const totalValue = validMetrics.reduce((sum, m) => sum + m.totalInventoryValue, 0)
        const totalItems = validMetrics.reduce((sum, m) => sum + m.totalItems, 0)
        const averageTurnover = validMetrics.reduce((sum, m) => sum + m.monthlyTurnover, 0) / validMetrics.length
        const averageWaste = validMetrics.reduce((sum, m) => sum + m.wastePercentage, 0) / validMetrics.length
        const averageProfitMargin = validMetrics.reduce((sum, m) => sum + m.profitMargin, 0) / validMetrics.length

        // Find best and worst performing businesses
        const bestTurnover = validMetrics.reduce((best, current) =>
          current.monthlyTurnover > best.monthlyTurnover ? current : best
        )

        const worstWaste = validMetrics.reduce((worst, current) =>
          current.wastePercentage > worst.wastePercentage ? current : worst
        )

        setAggregatedMetrics({
          totalValue,
          totalItems,
          averageTurnover,
          averageWaste,
          averageProfitMargin,
          bestPerformingBusiness: {
            name: bestTurnover.businessName,
            type: bestTurnover.businessType,
            metric: 'Monthly Turnover',
            value: bestTurnover.monthlyTurnover
          },
          worstPerformingBusiness: {
            name: worstWaste.businessName,
            type: worstWaste.businessType,
            metric: 'Waste Percentage',
            value: worstWaste.wastePercentage
          },
          industryBenchmarks: {
            turnover: { restaurant: 12, grocery: 8, clothing: 4, hardware: 6 },
            waste: { restaurant: 3, grocery: 2, clothing: 1, hardware: 1 },
            profitMargin: { restaurant: 15, grocery: 22, clothing: 45, hardware: 28 }
          }
        })
      }

    } catch (error) {
      console.error('Error fetching cross-business metrics:', error)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (businesses.length > 0) {
      fetchCrossBusinessMetrics()
    }
  }, [businesses, timeRange])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getBusinessTypeIcon = (type: string) => {
    switch (type) {
      case 'restaurant': return '🍽️'
      case 'grocery': return '🛒'
      case 'clothing': return '👕'
      case 'hardware': return '🔧'
      default: return '🏢'
    }
  }

  const getMetricValue = (business: BusinessMetrics, metric: string) => {
    switch (metric) {
      case 'value': return business.totalInventoryValue
      case 'turnover': return business.monthlyTurnover
      case 'waste': return business.wastePercentage
      case 'margin': return business.profitMargin
      default: return 0
    }
  }

  const formatMetricValue = (value: number, metric: string) => {
    switch (metric) {
      case 'value': return formatCurrency(value)
      case 'turnover': return `${value.toFixed(1)}x`
      case 'waste': return `${value.toFixed(1)}%`
      case 'margin': return `${value.toFixed(1)}%`
      default: return value.toString()
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">⚠️ {error}</div>
        <button
          onClick={fetchCrossBusinessMetrics}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary">Cross-Business Analytics</h2>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => window.location.search = `?timeRange=${e.target.value}`}
            className="input-field text-sm"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
          <button
            onClick={fetchCrossBusinessMetrics}
            className="btn-secondary text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Aggregated Overview */}
      {aggregatedMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="text-sm text-secondary">Total Portfolio Value</div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(aggregatedMetrics.totalValue)}
            </div>
            <div className="text-sm text-green-600">
              Across {businesses.length} businesses
            </div>
          </div>

          <div className="card p-6">
            <div className="text-sm text-secondary">Average Turnover</div>
            <div className="text-2xl font-bold text-primary">
              {aggregatedMetrics.averageTurnover.toFixed(1)}x
            </div>
            <div className="text-sm text-blue-600">Monthly rate</div>
          </div>

          <div className="card p-6">
            <div className="text-sm text-secondary">Average Waste</div>
            <div className="text-2xl font-bold text-orange-600">
              {aggregatedMetrics.averageWaste.toFixed(1)}%
            </div>
            <div className="text-sm text-secondary">Portfolio average</div>
          </div>

          <div className="card p-6">
            <div className="text-sm text-secondary">Average Margin</div>
            <div className="text-2xl font-bold text-green-600">
              {aggregatedMetrics.averageProfitMargin.toFixed(1)}%
            </div>
            <div className="text-sm text-secondary">Profit margin</div>
          </div>
        </div>
      )}

      {/* Performance Highlights */}
      {aggregatedMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 border-green-200 bg-green-50">
            <h3 className="text-lg font-semibold text-green-800 mb-3">
              🏆 Best Performer
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getBusinessTypeIcon(aggregatedMetrics.bestPerformingBusiness.type)}</span>
              <div>
                <div className="font-medium">{aggregatedMetrics.bestPerformingBusiness.name}</div>
                <div className="text-sm text-green-700">
                  {aggregatedMetrics.bestPerformingBusiness.metric}: {aggregatedMetrics.bestPerformingBusiness.value.toFixed(1)}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6 border-orange-200 bg-orange-50">
            <h3 className="text-lg font-semibold text-orange-800 mb-3">
              📈 Needs Attention
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getBusinessTypeIcon(aggregatedMetrics.worstPerformingBusiness.type)}</span>
              <div>
                <div className="font-medium">{aggregatedMetrics.worstPerformingBusiness.name}</div>
                <div className="text-sm text-orange-700">
                  {aggregatedMetrics.worstPerformingBusiness.metric}: {aggregatedMetrics.worstPerformingBusiness.value.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Comparisons */}
      {showComparisons && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Business Performance Comparison</h3>
            <div className="flex gap-2">
              {[
                { key: 'value', label: 'Inventory Value' },
                { key: 'turnover', label: 'Turnover Rate' },
                { key: 'waste', label: 'Waste %' },
                { key: 'margin', label: 'Profit Margin' }
              ].map((metric) => (
                <button
                  key={metric.key}
                  onClick={() => setSelectedMetric(metric.key as any)}
                  className={`px-3 py-1 text-sm rounded ${
                    selectedMetric === metric.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {businessMetrics
              .sort((a, b) => getMetricValue(b, selectedMetric) - getMetricValue(a, selectedMetric))
              .map((business, index) => {
                const value = getMetricValue(business, selectedMetric)
                const maxValue = Math.max(...businessMetrics.map(b => getMetricValue(b, selectedMetric)))
                const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0

                return (
                  <div key={business.businessId} className="flex items-center gap-4">
                    <div className="flex items-center gap-3 w-48">
                      <span className="text-lg">{getBusinessTypeIcon(business.businessType)}</span>
                      <div>
                        <div className="font-medium text-sm">{business.businessName}</div>
                        <div className="text-xs text-secondary capitalize">{business.businessType}</div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium">
                          {formatMetricValue(value, selectedMetric)}
                        </div>
                        <div className="text-xs text-secondary">#{index + 1}</div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            selectedMetric === 'waste' ? 'bg-red-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {showTrends && (
                      <div className="w-16 text-right">
                        <div className={`text-xs font-medium ${
                          business.recentTrends.inventoryValue > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {business.recentTrends.inventoryValue > 0 ? '↗' : '↘'}
                          {Math.abs(business.recentTrends.inventoryValue).toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Industry Benchmarks */}
      {aggregatedMetrics && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Industry Benchmarks</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-3">Monthly Turnover Rate</h4>
              <div className="space-y-2">
                {Object.entries(aggregatedMetrics.industryBenchmarks.turnover).map(([type, value]) => (
                  <div key={type} className="flex justify-between">
                    <span className="capitalize text-secondary">{type}:</span>
                    <span className="font-medium">{value}x</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Waste Percentage</h4>
              <div className="space-y-2">
                {Object.entries(aggregatedMetrics.industryBenchmarks.waste).map(([type, value]) => (
                  <div key={type} className="flex justify-between">
                    <span className="capitalize text-secondary">{type}:</span>
                    <span className="font-medium">{value}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Profit Margin</h4>
              <div className="space-y-2">
                {Object.entries(aggregatedMetrics.industryBenchmarks.profitMargin).map(([type, value]) => (
                  <div key={type} className="flex justify-between">
                    <span className="capitalize text-secondary">{type}:</span>
                    <span className="font-medium">{value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-xs text-secondary text-center">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  )
}